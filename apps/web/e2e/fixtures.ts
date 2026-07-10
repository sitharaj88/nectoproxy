import { test as base, expect } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';
import { createServer, request as httpRequest, type Server } from 'node:http';
import { existsSync } from 'node:fs';
import path from 'node:path';
import net from 'node:net';

/** Strips ANSI colour escape sequences (the CLI uses chalk on stdout). */
// eslint-disable-next-line no-control-regex
const ANSI = /\[[0-9;]*m/g;

/** Matches the `Web UI: http://localhost:8889/?token=<hex>` line from stdout. */
const TOKEN_LINE = /http:\/\/(localhost|127\.0\.0\.1|\[?[0-9a-fA-F:.]+\]?):(\d+)\/\?token=([a-f0-9]+)/i;

/** Proxy endpoint the CLI binds by default (`--port 8888`). */
export const PROXY_HOST = '127.0.0.1';
export const PROXY_PORT = 8888;

/**
 * Walks up from `start` until it finds the built CLI entrypoint. Avoids relying
 * on `__dirname` / `import.meta.url`, which behave differently depending on how
 * Playwright transpiles this file (CJS vs ESM under `"type": "module"`).
 */
function findCliEntry(start: string): string {
  let dir = start;
  for (let i = 0; i < 10; i++) {
    const candidate = path.join(dir, 'apps', 'cli', 'dist', 'index.js');
    if (existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(
    `Could not locate apps/cli/dist/index.js starting from ${start}. ` +
      'Did you build the CLI (pnpm --filter @nectoproxy/cli build)?'
  );
}

interface StartedServer {
  child: ChildProcess;
  appUrl: string;
  uiBaseUrl: string;
  token: string;
}

/**
 * Spawns the real CLI, reads stdout until the tokened Web UI URL appears, and
 * resolves with the token + tokened URL. Rejects if the line does not appear
 * within `timeoutMs` or the process exits early.
 */
function startServer(timeoutMs = 30_000): Promise<StartedServer> {
  const cliEntry = findCliEntry(process.cwd());

  return new Promise<StartedServer>((resolve, reject) => {
    // Use the same node that runs Playwright (>= 20 assumed) to launch the CLI.
    const child = spawn(process.execPath, [cliEntry, 'start', '--no-open'], {
      cwd: path.dirname(path.dirname(path.dirname(cliEntry))), // repo root
      env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let settled = false;
    let stdoutBuf = '';
    let stderrBuf = '';

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill('SIGKILL');
      reject(
        new Error(
          `Timed out after ${timeoutMs}ms waiting for the Web UI token line.\n` +
            `stdout:\n${stdoutBuf}\nstderr:\n${stderrBuf}`
        )
      );
    }, timeoutMs);

    const onData = (chunk: Buffer) => {
      stdoutBuf += chunk.toString('utf8').replace(ANSI, '');
      const match = stdoutBuf.match(TOKEN_LINE);
      if (match && !settled) {
        settled = true;
        clearTimeout(timer);
        const [uiBaseUrl] = match;
        const token = match[3];
        // Normalise to localhost so the browser reliably reaches the UI.
        const port = match[2];
        const appUrl = `http://localhost:${port}/?token=${token}`;
        resolve({ child, appUrl, uiBaseUrl, token });
      }
    };

    child.stdout?.on('data', onData);
    child.stderr?.on('data', (c: Buffer) => {
      stderrBuf += c.toString('utf8');
    });

    child.on('error', (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(err);
    });

    child.on('exit', (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(
        new Error(
          `CLI exited early (code=${code}, signal=${signal}) before printing the token line.\n` +
            `stdout:\n${stdoutBuf}\nstderr:\n${stderrBuf}`
        )
      );
    });
  });
}

/** Gracefully stops the CLI child and waits for the ports to free up. */
async function stopServer(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return;

  await new Promise<void>((resolve) => {
    const done = () => resolve();
    const hardKill = setTimeout(() => {
      try {
        child.kill('SIGKILL');
      } catch {
        /* already gone */
      }
    }, 5_000);
    child.once('exit', () => {
      clearTimeout(hardKill);
      done();
    });
    // The CLI installs a SIGINT/SIGTERM handler for graceful shutdown.
    child.kill('SIGINT');
  });

  // Best-effort: wait until the UI/proxy ports are actually released so a
  // subsequent run (or the concurrent lead server) doesn't hit EADDRINUSE.
  await waitForPortFree(PROXY_PORT).catch(() => undefined);
}

/** Resolves once nothing is listening on `port` (or after `timeoutMs`). */
function waitForPortFree(port: number, timeoutMs = 5_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  return new Promise<void>((resolve) => {
    const check = () => {
      const socket = net.connect({ host: PROXY_HOST, port }, () => {
        socket.destroy();
        if (Date.now() > deadline) return resolve();
        setTimeout(check, 200);
      });
      socket.on('error', () => {
        socket.destroy();
        resolve();
      });
    };
    check();
  });
}

/**
 * Issues a plain-HTTP GET *through* the NectoProxy proxy using an absolute-URI
 * request (standard forward-proxy form). Returns the origin status code.
 */
export function requestThroughProxy(targetUrl: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const target = new URL(targetUrl);
    const req = httpRequest(
      {
        host: PROXY_HOST,
        port: PROXY_PORT,
        method: 'GET',
        path: targetUrl, // absolute URI => proxy request
        headers: { Host: target.host, Connection: 'close' },
      },
      (res) => {
        res.resume();
        res.on('end', () => resolve(res.statusCode ?? 0));
      }
    );
    req.on('error', reject);
    req.end();
  });
}

/**
 * Spins up a throwaway local HTTP origin so traffic tests are deterministic and
 * work offline. Returns the base URL and a stop() to shut it down.
 */
export async function startLocalOrigin(): Promise<{ baseUrl: string; stop: () => Promise<void> }> {
  const server: Server = createServer((req, res) => {
    if (req.url?.includes('notfound')) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, url: req.url }));
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Failed to start local origin server');
  }
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const stop = () =>
    new Promise<void>((resolve) => server.close(() => resolve()));
  return { baseUrl, stop };
}

interface WorkerFixtures {
  /** The tokened Web UI URL. Navigate to this in tests. */
  appUrl: string;
}

/**
 * Worker-scoped: the real CLI is started once per worker and torn down when the
 * worker finishes. `workers: 1` in the config keeps this to a single server.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export const test = base.extend<{}, WorkerFixtures>({
  appUrl: [
    async ({}, use) => {
      const started = await startServer();
      try {
        await use(started.appUrl);
      } finally {
        await stopServer(started.child);
      }
    },
    { scope: 'worker' },
  ],
});

export { expect };
