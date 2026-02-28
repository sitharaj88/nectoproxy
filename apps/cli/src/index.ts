import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import open from 'open';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { CertificateManager } from '@nectoproxy/certs';
import { ProxyServer } from '@nectoproxy/core';
import { createApp, setNetworkProfileChangeCallback, setUpstreamProxyChangeCallback, setSSLPassthroughChangeCallback, setDnsMappingsChangeCallback } from '@nectoproxy/server';
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
  .option('--host <host>', 'Host to bind to', '127.0.0.1')
  .action(async (options) => {
    const proxyPort = parseInt(options.port, 10);
    const uiPort = parseInt(options.uiPort, 10);
    const autoOpen = options.open !== false;

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
      });

      // Create API server
      spinner.text = 'Starting API server...';
      // Resolve path to web UI dist folder
      const webDistPath = path.resolve(__dirname, 'web-ui');
      const appInstance = createApp(certManager, {
        port: uiPort,
        staticDir: webDistPath,
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
        });
      });

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

      // Display info
      console.log(chalk.white('  Proxy Server:'), chalk.green(`http://${options.host}:${proxyPort}`));
      console.log(chalk.white('  Web UI:'), chalk.green(`http://localhost:${uiPort}`));
      console.log(chalk.white('  Session:'), chalk.yellow(session.name));
      console.log();

      // Display certificate info
      const caPath = certManager.getCACertificatePath();
      console.log(chalk.white('  CA Certificate:'), chalk.cyan(caPath));
      console.log(chalk.dim('  Install the CA certificate to inspect HTTPS traffic.'));
      console.log(chalk.dim(`  Run: ${chalk.white('nectoproxy cert --install')} for instructions.`));
      console.log();

      // Open browser
      if (autoOpen) {
        const uiUrl = `http://localhost:${uiPort}`;
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

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

program.parse();
