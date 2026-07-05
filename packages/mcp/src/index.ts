export { createMcpServer, startMcpServer, type McpServerConfig } from './server.js';
export { NectoApiClient, NectoApiError } from './api.js';

const DEFAULT_API_URL = 'http://127.0.0.1:8889';

export interface ResolveConfigOptions {
  /** Explicit API base URL (overrides NECTO_API_URL). */
  url?: string;
  /** Explicit session token (overrides NECTO_TOKEN). */
  token?: string;
}

/**
 * Resolve MCP server configuration from explicit options, then environment
 * variables (`NECTO_API_URL`, `NECTO_TOKEN`), then defaults.
 *
 * Throws if no token can be found — the control-plane API rejects unauthenticated
 * requests, so a token is mandatory.
 */
export function resolveMcpConfig(opts: ResolveConfigOptions = {}): {
  apiUrl: string;
  token: string;
} {
  const apiUrl = opts.url ?? process.env.NECTO_API_URL ?? DEFAULT_API_URL;
  const token = opts.token ?? process.env.NECTO_TOKEN;

  if (!token) {
    throw new Error(
      'A NectoProxy session token is required. Pass --token <token> or set ' +
        'NECTO_TOKEN. The token is printed by `nectoproxy start` (it appears in ' +
        'the Web UI URL as ?token=...).',
    );
  }

  return { apiUrl, token };
}
