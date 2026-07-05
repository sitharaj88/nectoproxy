import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import open from 'open';
import qrcode from 'qrcode-terminal';
import path from 'node:path';
import crypto from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { networkInterfaces } from 'node:os';
import { CertificateManager } from '@nectoproxy/certs';
import { ProxyServer } from '@nectoproxy/core';
import { createApp, setNetworkProfileChangeCallback, setUpstreamProxyChangeCallback, setSSLPassthroughChangeCallback, setDnsMappingsChangeCallback, setWebSocketSendHandler } from '@nectoproxy/server';
import { SessionRepository, TrafficRepository, SSLPassthroughRepository, DnsMappingRepository, getDatabase } from '@nectoproxy/storage';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf-8'));

const program = new Command();

program
  .name('nectoproxy')
  .description('A powerful HTTP/HTTPS debugging proxy with Web UI')
  .version(pkg.version);

program
  .command('start')
  .description('Start the proxy server and Web UI')
  .option('-p, --port <port>', 'Proxy server port', '8888')
  .option('-u, --ui-port <port>', 'Web UI port', '8889')
  .option('--no-open', 'Do not auto-open browser')
  .option('--host <host>', 'Host to bind the proxy port to', '0.0.0.0')
  .option('--ui-host <host>', 'Host to bind the Web UI / control-plane API to', '127.0.0.1')
  .option('--http2', 'Enable experimental HTTP/2 interception (h2 clients, forwarded to origins over HTTP/1.1)', false)
  .action(async (options) => {
    const proxyPort = parseInt(options.port, 10);
    const uiPort = parseInt(options.uiPort, 10);
    const autoOpen = options.open !== false;
    const uiHost = options.uiHost as string;

    // Cryptographically-random session token, generated once per run. Protects
    // the control-plane API and Socket.IO from unauthenticated access.
    const sessionToken = crypto.randomBytes(32).toString('hex');

    console.log(chalk.bold.cyan('\n  NectoProxy - HTTP/HTTPS Debugging Proxy\n'));

    const spinner = ora('Initializing...').start();

    try {
      // Initialize database
      spinner.text = 'Initializing database...';
      getDatabase();

      // Initialize certificate manager
      spinner.text = 'Initializing certificates...';
      const certManager = new CertificateManager();
      await certManager.initialize();

      // Create or get active session
      spinner.text = 'Setting up session...';
      const sessionRepo = new SessionRepository();
      let session = await sessionRepo.findActive();

      if (!session) {
        session = await sessionRepo.create({
          name: `Session ${new Date().toLocaleDateString()}`,
        });
      }

      // Create proxy server
      spinner.text = 'Starting proxy server...';
      const proxyServer = new ProxyServer(certManager, {
        port: proxyPort,
        host: options.host,
        enableHttp2: options.http2 === true,
      });

      // Create API server
      spinner.text = 'Starting API server...';
      // Resolve path to web UI dist folder
      const webDistPath = path.resolve(__dirname, 'web-ui');
      const appInstance = createApp(certManager, {
        port: uiPort,
        host: uiHost,
        staticDir: webDistPath,
        token: sessionToken,
      });

      // Connect proxy events to socket server and persist to database
      const trafficRepo = new TrafficRepository();

      proxyServer.on('traffic:new', (entry) => {
        appInstance.socketServer.emitTrafficNew(entry);
        // Persist to database (fire-and-forget)
        trafficRepo.create(entry).catch((err) => {
          // Ignore duplicate ID errors on rapid updates
          if (!String(err).includes('UNIQUE constraint')) {
            console.error(chalk.dim('DB write error:'), err.message);
          }
        });
      });

      proxyServer.on('traffic:update', (update) => {
        appInstance.socketServer.emitTrafficUpdate(update);
        // Persist update to database (fire-and-forget)
        trafficRepo.update(update.id, update).catch(() => {
          // Silently ignore update errors for entries not yet in DB
        });
      });

      proxyServer.on('error', (error) => {
        console.error(chalk.red('Proxy error:'), error.message);
        appInstance.socketServer.emitProxyError(error.message);
      });

      // Connect breakpoint events to socket server
      const breakpointManager = proxyServer.getBreakpointManager();

      breakpointManager.on('breakpoint:hit', (hit) => {
        appInstance.socketServer.emitBreakpointHit(hit);
      });

      breakpointManager.on('breakpoint:resumed', (id) => {
        appInstance.socketServer.emitBreakpointResumed(id);
      });

      breakpointManager.on('breakpoint:timeout', (id) => {
        appInstance.socketServer.emitBreakpointTimeout(id);
      });

      // Set up resume handler from socket to breakpoint manager
      appInstance.socketServer.setBreakpointResumeHandler((hitId, resume) => {
        proxyServer.resumeBreakpoint(hitId, resume);
      });

      // Connect WebSocket events to socket server
      const webSocketHandler = proxyServer.getWebSocketHandler();

      webSocketHandler.on('websocket:open', (data) => {
        appInstance.socketServer.emitWebSocketOpen({
          ...data,
          sessionId: session.id,
        });
      });

      webSocketHandler.on('websocket:frame', (frame) => {
        // Convert Buffer to base64 for JSON transport
        appInstance.socketServer.emitWebSocketFrame({
          id: frame.id,
          trafficId: frame.trafficId,
          timestamp: frame.timestamp,
          direction: frame.direction,
          opcode: frame.opcode,
          data: frame.data ? frame.data.toString('base64') : null,
          isBinary: frame.isBinary,
          length: frame.length,
          injected: frame.injected,
        });
      });

      // Allow the server API to inject frames into live WebSocket connections
      setWebSocketSendHandler((trafficId, direction, data, isBinary) =>
        webSocketHandler.sendFrame(trafficId, direction, data, isBinary ? 2 : 1)
      );

      webSocketHandler.on('websocket:close', (data) => {
        appInstance.socketServer.emitWebSocketClose(data);
      });

      webSocketHandler.on('websocket:error', (data) => {
        appInstance.socketServer.emitWebSocketError(data);
      });

      // Connect network profile changes to proxy server
      setNetworkProfileChangeCallback((profile) => {
        proxyServer.setNetworkProfile(profile);
      });

      // Connect upstream proxy changes to proxy server
      setUpstreamProxyChangeCallback((config) => {
        proxyServer.setUpstreamProxy(config);
      });

      // Load SSL passthrough domains and connect changes to proxy server
      const sslPassthroughRepo = new SSLPassthroughRepository();
      const enabledPassthroughDomains = await sslPassthroughRepo.findEnabled();
      proxyServer.setSslPassthroughDomains(enabledPassthroughDomains.map((d) => d.domain));

      setSSLPassthroughChangeCallback((domains) => {
        proxyServer.setSslPassthroughDomains(domains);
      });

      // Load DNS mappings and connect changes to proxy server
      const dnsMappingRepo = new DnsMappingRepository();
      const enabledDnsMappings = await dnsMappingRepo.findEnabled();
      proxyServer.setDnsMappings(enabledDnsMappings.map((m) => ({ domain: m.domain, targetIp: m.targetIp })));

      setDnsMappingsChangeCallback((mappings) => {
        proxyServer.setDnsMappings(mappings);
      });

      // Start servers
      await proxyServer.start(session.id);
      await appInstance.start();

      spinner.succeed('NectoProxy started successfully!\n');

      // Resolve LAN IP (used for display when a host is bound to 0.0.0.0)
      const resolveLanIp = (): string => {
        const nets = networkInterfaces();
        const lanIp = Object.values(nets).flat().find(
          (n) => n && n.family === 'IPv4' && !n.internal
        );
        return lanIp?.address ?? 'localhost';
      };

      // Proxy display host — show the machine's LAN IP instead of 0.0.0.0
      let displayHost = options.host;
      if (displayHost === '0.0.0.0') {
        displayHost = resolveLanIp();
      }

      // UI/API display host — bound to ui-host (localhost by default)
      let uiDisplayHost = uiHost;
      if (uiHost === '0.0.0.0') {
        uiDisplayHost = resolveLanIp();
      } else if (uiHost === '127.0.0.1') {
        uiDisplayHost = 'localhost';
      }

      const isUiLocal = uiHost === '127.0.0.1' || uiHost === 'localhost' || uiHost === '::1';
      const uiUrl = `http://${uiDisplayHost}:${uiPort}/?token=${sessionToken}`;

      // Warn loudly if the control plane is exposed on the network.
      if (!isUiLocal) {
        console.log(
          chalk.bold.yellow(
            '  WARNING: The Web UI / control-plane API is exposed on the network'
          )
        );
        console.log(
          chalk.bold.yellow(
            `  (bound to ${uiHost}). It is protected by a session token, but anyone`
          )
        );
        console.log(
          chalk.bold.yellow(
            '  with the token URL can control this proxy. Prefer --ui-host 127.0.0.1.'
          )
        );
        console.log();
      }

      // Display info
      console.log(chalk.white('  Proxy Server:'), chalk.green(`http://${displayHost}:${proxyPort}`));
      console.log(chalk.white('  Web UI:'), chalk.green(uiUrl));
      console.log(chalk.white('  Session:'), chalk.yellow(session.name));
      console.log();

      // Display certificate info
      console.log(chalk.white('  CA Certificate:'), chalk.cyan(`http://${uiDisplayHost}:${uiPort}/api/certificates/ca`));
      console.log(chalk.dim('  Install the CA certificate to inspect HTTPS traffic.'));
      console.log(chalk.dim(`  Run: ${chalk.white('nectoproxy cert --install')} for instructions.`));
      console.log();

      // Mobile device setup: once a phone/tablet is pointed at the proxy, it can
      // browse to this magic host to install the CA — works regardless of where
      // the Web UI is bound.
      const setupUrl = 'http://necto.setup';
      console.log(chalk.white('  Mobile Setup:'), chalk.green(setupUrl));
      console.log(chalk.dim(`  1. Set the device's HTTP proxy to ${chalk.white(`${displayHost}:${proxyPort}`)}`));
      console.log(chalk.dim(`  2. Open ${chalk.white(setupUrl)} on the device (or scan below) and install the CA.`));
      qrcode.generate(setupUrl, { small: true }, (qr: string) => {
        console.log(
          qr
            .split('\n')
            .map((line) => `  ${line}`)
            .join('\n')
        );
      });
      console.log();

      // Open browser
      if (autoOpen) {
        console.log(chalk.dim(`  Opening ${uiUrl} in your browser...`));
        await open(uiUrl);
      }

      console.log(chalk.dim('  Press Ctrl+C to stop.\n'));

      // Notify socket clients
      appInstance.socketServer.emitProxyStarted({
        port: proxyPort,
        uiPort,
        autoOpenBrowser: autoOpen,
        recording: true,
      });

      // Handle shutdown
      const shutdown = async () => {
        console.log(chalk.yellow('\n  Shutting down...'));

        appInstance.socketServer.emitProxyStopped();
        await proxyServer.stop();
        await appInstance.stop();

        console.log(chalk.green('  Goodbye!\n'));
        process.exit(0);
      };

      process.on('SIGINT', shutdown);
      process.on('SIGTERM', shutdown);
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === 'EADDRINUSE') {
        spinner.fail(`Port is already in use`);
        console.error(chalk.yellow(`\n  Try a different port: nectoproxy start -p ${proxyPort + 1}`));
      } else {
        spinner.fail('Failed to start NectoProxy');
        console.error(chalk.red('\nError:'), (error as Error).message);
      }
      process.exit(1);
    }
  });

program
  .command('cert')
  .description('Certificate management')
  .option('--install', 'Show certificate installation instructions')
  .option('--path', 'Show CA certificate path')
  .option('--clear-cache', 'Clear domain certificate cache')
  .action(async (options) => {
    try {
      const certManager = new CertificateManager();
      await certManager.initialize();

      if (options.path) {
        console.log(certManager.getCACertificatePath());
        return;
      }

      if (options.clearCache) {
        await certManager.clearDomainCache();
        console.log(chalk.green('Certificate cache cleared.'));
        return;
      }

      if (options.install) {
        console.log(certManager.getInstallInstructions());
        return;
      }

      // Default: show cert info
      const ca = certManager.getCACertificate();
      console.log(chalk.bold('\nNectoProxy CA Certificate\n'));
      console.log(chalk.white('Path:'), chalk.cyan(certManager.getCACertificatePath()));
      if (ca?.fingerprint) {
        console.log(chalk.white('Fingerprint:'), chalk.yellow(ca.fingerprint));
      }
      console.log();
      console.log(chalk.dim('Run with --install for installation instructions.'));
    } catch (error) {
      console.error(chalk.red('Error:'), (error as Error).message);
      process.exit(1);
    }
  });

program
  .command('sessions')
  .description('Session management')
  .option('--list', 'List all sessions')
  .option('--create <name>', 'Create a new session')
  .option('--delete <id>', 'Delete a session')
  .action(async (options) => {
    try {
      getDatabase();
      const sessionRepo = new SessionRepository();

      if (options.create) {
        const session = await sessionRepo.create({ name: options.create });
        console.log(chalk.green('Session created:'), session.id);
        return;
      }

      if (options.delete) {
        const deleted = await sessionRepo.delete(options.delete);
        if (deleted) {
          console.log(chalk.green('Session deleted.'));
        } else {
          console.log(chalk.red('Session not found.'));
        }
        return;
      }

      // Default: list sessions
      const sessions = await sessionRepo.findAll();

      if (sessions.length === 0) {
        console.log(chalk.yellow('No sessions found.'));
        return;
      }

      console.log(chalk.bold('\nSessions:\n'));
      for (const session of sessions) {
        const active = session.isActive ? chalk.green(' (active)') : '';
        console.log(`  ${chalk.cyan(session.id)} - ${session.name}${active}`);
        console.log(`    Traffic: ${session.trafficCount} requests, ${formatBytes(session.totalBytes)}`);
        console.log();
      }
    } catch (error) {
      console.error(chalk.red('Error:'), (error as Error).message);
      process.exit(1);
    }
  });

program
  .command('mcp')
  .description('Start the Model Context Protocol (MCP) server over stdio for AI assistants')
  .option('-u, --url <url>', 'NectoProxy control-plane API URL', process.env.NECTO_API_URL || 'http://127.0.0.1:8889')
  .option('-t, --token <token>', 'Session token printed by `nectoproxy start` (or set NECTO_TOKEN)')
  .action(async (options) => {
    const token = (options.token as string | undefined) || process.env.NECTO_TOKEN;

    if (!token) {
      // stderr only — stdout is the JSON-RPC channel and must stay clean.
      console.error(
        chalk.red('Error:'),
        'A session token is required. Pass --token <token> or set NECTO_TOKEN.'
      );
      console.error(
        chalk.dim('  The token is printed by `nectoproxy start` (in the Web UI URL as ?token=...).')
      );
      process.exit(1);
    }

    try {
      const { startMcpServer } = await import('@nectoproxy/mcp');
      await startMcpServer({ apiUrl: options.url as string, token });
    } catch (error) {
      console.error(chalk.red('MCP server error:'), (error as Error).message);
      process.exit(1);
    }
  });

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

program.parse();
