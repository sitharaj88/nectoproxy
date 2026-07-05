#!/usr/bin/env node
import { startMcpServer } from './server.js';
import { resolveMcpConfig } from './index.js';

/**
 * Minimal standalone entrypoint for the `nectoproxy-mcp` bin. Accepts
 * `--url <url>` and `--token <token>`; falls back to NECTO_API_URL / NECTO_TOKEN.
 *
 * The primary way to launch this server is `nectoproxy mcp`, but this bin lets
 * the package be used on its own.
 */
function parseArgs(argv: string[]): { url?: string; token?: string } {
  const out: { url?: string; token?: string } = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--url' || arg === '-u') out.url = argv[++i];
    else if (arg === '--token' || arg === '-t') out.token = argv[++i];
    else if (arg.startsWith('--url=')) out.url = arg.slice('--url='.length);
    else if (arg.startsWith('--token=')) out.token = arg.slice('--token='.length);
  }
  return out;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const { apiUrl, token } = resolveMcpConfig(args);
  await startMcpServer({ apiUrl, token });
}

main().catch((err) => {
  // stderr only — stdout is the JSON-RPC channel and must stay clean.
  console.error(`[nectoproxy-mcp] ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
