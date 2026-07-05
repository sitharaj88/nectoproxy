import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import type { RuleCreateInput, RuleMatcher, RuleAction } from '@nectoproxy/shared';
import { NectoApiClient, NectoApiError } from './api.js';
import { decodeBody, getHeader, toSummary } from './format.js';

export interface McpServerConfig {
  /** Base URL of the NectoProxy control-plane API (Web UI port). */
  apiUrl: string;
  /** Per-run session token printed by `nectoproxy start`. */
  token: string;
}

/** JSON tool result. */
function jsonResult(data: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
  };
}

/** Error tool result — surfaced to the model with `isError`. */
function errorResult(err: unknown) {
  const message =
    err instanceof NectoApiError
      ? err.message
      : err instanceof Error
        ? err.message
        : String(err);
  return {
    content: [{ type: 'text' as const, text: `Error: ${message}` }],
    isError: true as const,
  };
}

/** Wrap a tool handler so thrown errors become clean `isError` results. */
function guard<A>(fn: (args: A) => Promise<ReturnType<typeof jsonResult>>) {
  return async (args: A) => {
    try {
      return await fn(args);
    } catch (err) {
      return errorResult(err);
    }
  };
}

const matchSchema = z
  .object({
    url: z.string().optional().describe('Match request URL (substring or regex source)'),
    method: z
      .union([z.string(), z.array(z.string())])
      .optional()
      .describe('HTTP method(s) to match, e.g. "GET" or ["GET","POST"]'),
    host: z.string().optional().describe('Match request host, e.g. "api.example.com"'),
    path: z.string().optional().describe('Match request path (substring or regex source)'),
    bodyContains: z.string().optional().describe('Match requests whose body contains this string'),
  })
  .describe('Conditions that decide whether the rule applies to a request');

/**
 * Build an {@link McpServer} with all NectoProxy tools registered against the
 * given API client.
 */
export function createMcpServer(config: McpServerConfig): McpServer {
  const api = new NectoApiClient(config.apiUrl, config.token);

  const server = new McpServer({
    name: 'nectoproxy',
    version: '0.1.2',
  });

  // ---- Traffic inspection --------------------------------------------------

  server.registerTool(
    'list_traffic',
    {
      title: 'List captured traffic',
      description:
        'List recent captured HTTP/HTTPS requests as compact summaries ' +
        '(id, method, url, status, duration, sizes). Bodies are NOT included — ' +
        'use get_traffic for full detail. Supports optional method/status/host filters.',
      inputSchema: {
        limit: z.number().int().min(1).max(1000).optional().describe('Max entries to return (default 50)'),
        offset: z.number().int().min(0).optional().describe('Pagination offset'),
        method: z.string().optional().describe('Filter by HTTP method, e.g. "GET"'),
        status: z.number().int().optional().describe('Filter by exact HTTP status code, e.g. 404'),
        host: z.string().optional().describe('Filter by host, e.g. "api.example.com"'),
      },
    },
    guard(async (args: { limit?: number; offset?: number; method?: string; status?: number; host?: string }) => {
      const entries = await api.listTraffic({
        limit: args.limit ?? 50,
        offset: args.offset,
        methods: args.method ? [args.method.toUpperCase()] : undefined,
        statusCodes: args.status !== undefined ? [args.status] : undefined,
        hosts: args.host ? [args.host] : undefined,
      });
      return jsonResult({ count: entries.length, entries: entries.map(toSummary) });
    }),
  );

  server.registerTool(
    'get_traffic',
    {
      title: 'Get full traffic detail',
      description:
        'Get the full detail for a single captured entry by id, including request ' +
        'and response headers and bodies. Bodies are decoded to text when possible; ' +
        'binary bodies are reported as a placeholder.',
      inputSchema: {
        id: z.string().describe('The traffic entry id (from list_traffic / search_traffic)'),
      },
    },
    guard(async (args: { id: string }) => {
      const entry = await api.getTraffic(args.id);
      const reqBody = decodeBody(entry.requestBody, getHeader(entry.requestHeaders, 'content-type'));
      const resBody = decodeBody(entry.responseBody, getHeader(entry.responseHeaders, 'content-type'));
      return jsonResult({
        id: entry.id,
        timestamp: entry.timestamp,
        request: {
          method: entry.method,
          url: entry.url,
          host: entry.host,
          path: entry.path,
          protocol: entry.protocol,
          headers: entry.requestHeaders,
          bodySize: entry.requestBodySize,
          body: reqBody.text,
          bodyNote: reqBody.note,
        },
        response: {
          status: entry.status,
          statusText: entry.statusText,
          headers: entry.responseHeaders,
          bodySize: entry.responseBodySize,
          body: resBody.text,
          bodyNote: resBody.note,
        },
        durationMs: entry.duration,
        remoteAddress: entry.remoteAddress,
        tlsVersion: entry.tlsVersion,
        error: entry.error,
        isMocked: entry.isMocked,
        isTruncated: entry.isTruncated,
      });
    }),
  );

  server.registerTool(
    'search_traffic',
    {
      title: 'Search captured traffic',
      description:
        'Search captured traffic by URL substring, method, host, HTTP status range, ' +
        'or response content-type. Returns compact summaries. Combine any filters.',
      inputSchema: {
        urlContains: z.string().optional().describe('Case-insensitive substring to match in the URL'),
        method: z.string().optional().describe('HTTP method, e.g. "POST"'),
        host: z.string().optional().describe('Exact host to match'),
        statusMin: z.number().int().optional().describe('Minimum HTTP status (inclusive), e.g. 400'),
        statusMax: z.number().int().optional().describe('Maximum HTTP status (inclusive), e.g. 599'),
        contentType: z.string().optional().describe('Substring to match in the response content-type'),
        limit: z.number().int().min(1).max(1000).optional().describe('Max results (default 50)'),
      },
    },
    guard(
      async (args: {
        urlContains?: string;
        method?: string;
        host?: string;
        statusMin?: number;
        statusMax?: number;
        contentType?: string;
        limit?: number;
      }) => {
        // Push method/host/text filters server-side; scan a wider window so the
        // client-side status-range / content-type filters have material to work with.
        const scanned = await api.listTraffic({
          limit: 1000,
          methods: args.method ? [args.method.toUpperCase()] : undefined,
          hosts: args.host ? [args.host] : undefined,
          search: args.urlContains,
        });

        const urlNeedle = args.urlContains?.toLowerCase();
        const ctNeedle = args.contentType?.toLowerCase();
        const limit = args.limit ?? 50;

        const matched = scanned.filter((e) => {
          if (urlNeedle && !e.url.toLowerCase().includes(urlNeedle)) return false;
          if (args.statusMin !== undefined && (e.status === null || e.status < args.statusMin)) return false;
          if (args.statusMax !== undefined && (e.status === null || e.status > args.statusMax)) return false;
          if (ctNeedle) {
            const ct = getHeader(e.responseHeaders, 'content-type')?.toLowerCase() ?? '';
            if (!ct.includes(ctNeedle)) return false;
          }
          return true;
        });

        return jsonResult({
          count: matched.length,
          entries: matched.slice(0, limit).map(toSummary),
        });
      },
    ),
  );

  server.registerTool(
    'get_traffic_stats',
    {
      title: 'Aggregate traffic statistics',
      description:
        'Compute aggregate statistics over recent captured traffic: total count, ' +
        'counts by status class (2xx/3xx/4xx/5xx/pending), counts by host, error ' +
        'count, and average response duration.',
      inputSchema: {
        sampleLimit: z
          .number()
          .int()
          .min(1)
          .max(1000)
          .optional()
          .describe('How many recent entries to aggregate over (default 1000)'),
      },
    },
    guard(async (args: { sampleLimit?: number }) => {
      const entries = await api.listTraffic({ limit: args.sampleLimit ?? 1000 });

      const byStatusClass: Record<string, number> = { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0, pending: 0, other: 0 };
      const byHost: Record<string, number> = {};
      let errorCount = 0;
      let durationSum = 0;
      let durationCount = 0;

      for (const e of entries) {
        byHost[e.host] = (byHost[e.host] ?? 0) + 1;
        if (e.error || (e.status !== null && e.status >= 400)) errorCount++;
        if (typeof e.duration === 'number') {
          durationSum += e.duration;
          durationCount++;
        }
        if (e.status === null) byStatusClass.pending++;
        else if (e.status >= 200 && e.status < 300) byStatusClass['2xx']++;
        else if (e.status >= 300 && e.status < 400) byStatusClass['3xx']++;
        else if (e.status >= 400 && e.status < 500) byStatusClass['4xx']++;
        else if (e.status >= 500 && e.status < 600) byStatusClass['5xx']++;
        else byStatusClass.other++;
      }

      const topHosts = Object.entries(byHost)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([host, count]) => ({ host, count }));

      return jsonResult({
        total: entries.length,
        byStatusClass,
        errorCount,
        avgDurationMs: durationCount > 0 ? Math.round(durationSum / durationCount) : null,
        topHosts,
      });
    }),
  );

  // ---- Rules engine --------------------------------------------------------

  server.registerTool(
    'list_rules',
    {
      title: 'List rules',
      description: 'List all rules in the NectoProxy rules engine (mock, block, modify, etc.).',
      inputSchema: {},
    },
    guard(async () => {
      const rules = await api.listRules();
      return jsonResult({ count: rules.length, rules });
    }),
  );

  server.registerTool(
    'create_rule',
    {
      title: 'Create a rule',
      description:
        'Create a rule in the rules engine. Supported actions:\n' +
        '- "mock": return a canned response (provide `mock.status` and optional headers/body).\n' +
        '- "block": abort matching requests (no config needed).\n' +
        '- "modify-request": add/remove request headers (modify-header on the request side).\n' +
        '- "modify-response": change status and/or add/remove response headers or replace body.\n' +
        'The `match` object decides which requests the rule applies to.',
      inputSchema: {
        name: z.string().describe('Human-readable rule name'),
        action: z
          .enum(['mock', 'block', 'modify-request', 'modify-response'])
          .describe('What the rule does to matching requests'),
        enabled: z.boolean().optional().describe('Whether the rule is active (default true)'),
        priority: z.number().int().optional().describe('Evaluation priority (lower runs first)'),
        match: matchSchema,
        // mock action config
        mock: z
          .object({
            status: z.number().int().describe('HTTP status to return'),
            statusText: z.string().optional(),
            headers: z.record(z.string()).optional(),
            body: z.string().optional().describe('Response body (string)'),
          })
          .optional()
          .describe('Config for action="mock"'),
        // modify-request config
        setRequestHeaders: z.record(z.string()).optional().describe('Headers to set on the request (action="modify-request")'),
        removeRequestHeaders: z.array(z.string()).optional().describe('Header names to remove from the request'),
        // modify-response config
        setResponseStatus: z.number().int().optional().describe('Override response status (action="modify-response")'),
        setResponseHeaders: z.record(z.string()).optional().describe('Headers to set on the response'),
        removeResponseHeaders: z.array(z.string()).optional().describe('Header names to remove from the response'),
        replaceResponseBody: z.string().optional().describe('Replace the response body with this string'),
      },
    },
    guard(
      async (args: {
        name: string;
        action: 'mock' | 'block' | 'modify-request' | 'modify-response';
        enabled?: boolean;
        priority?: number;
        match: z.infer<typeof matchSchema>;
        mock?: { status: number; statusText?: string; headers?: Record<string, string>; body?: string };
        setRequestHeaders?: Record<string, string>;
        removeRequestHeaders?: string[];
        setResponseStatus?: number;
        setResponseHeaders?: Record<string, string>;
        removeResponseHeaders?: string[];
        replaceResponseBody?: string;
      }) => {
        let config: RuleCreateInput['config'] = null;

        switch (args.action) {
          case 'mock':
            if (!args.mock) {
              throw new NectoApiError('action="mock" requires a `mock` object with at least a `status`.');
            }
            config = {
              status: args.mock.status,
              statusText: args.mock.statusText,
              headers: args.mock.headers,
              body: args.mock.body,
            };
            break;
          case 'block':
            config = null;
            break;
          case 'modify-request':
            if (!args.setRequestHeaders && !args.removeRequestHeaders) {
              throw new NectoApiError(
                'action="modify-request" requires setRequestHeaders and/or removeRequestHeaders.',
              );
            }
            config = {
              setHeaders: args.setRequestHeaders,
              removeHeaders: args.removeRequestHeaders,
            };
            break;
          case 'modify-response':
            config = {
              setStatus: args.setResponseStatus,
              setHeaders: args.setResponseHeaders,
              removeHeaders: args.removeResponseHeaders,
              replaceBody: args.replaceResponseBody,
            };
            break;
        }

        const input: RuleCreateInput = {
          name: args.name,
          enabled: args.enabled ?? true,
          priority: args.priority,
          match: args.match as RuleMatcher,
          action: args.action as RuleAction,
          config,
        };

        const rule = await api.createRule(input);
        return jsonResult({ created: true, rule });
      },
    ),
  );

  server.registerTool(
    'toggle_rule',
    {
      title: 'Toggle a rule',
      description: "Enable or disable a rule by id (flips its enabled flag).",
      inputSchema: {
        id: z.string().describe('The rule id (from list_rules)'),
      },
    },
    guard(async (args: { id: string }) => {
      const rule = await api.toggleRule(args.id);
      return jsonResult({ toggled: true, id: rule.id, enabled: rule.enabled });
    }),
  );

  server.registerTool(
    'delete_rule',
    {
      title: 'Delete a rule',
      description: 'Delete a rule by id.',
      inputSchema: {
        id: z.string().describe('The rule id (from list_rules)'),
      },
    },
    guard(async (args: { id: string }) => {
      await api.deleteRule(args.id);
      return jsonResult({ deleted: true, id: args.id });
    }),
  );

  // ---- Replay --------------------------------------------------------------

  server.registerTool(
    'replay_request',
    {
      title: 'Replay a captured request',
      description:
        'Re-send a previously captured request by id via the server replay endpoint ' +
        '(POST /api/traffic/:id/replay). Optionally override the method, URL, headers, ' +
        'or body before sending. Returns the new response plus a diff against the original.',
      inputSchema: {
        id: z.string().describe('The traffic entry id to replay'),
        method: z.string().optional().describe('Override HTTP method'),
        url: z.string().optional().describe('Override request URL'),
        headers: z.record(z.string()).optional().describe('Headers to merge over the original request headers'),
        body: z.string().optional().describe('Override request body (string)'),
      },
    },
    guard(
      async (args: { id: string; method?: string; url?: string; headers?: Record<string, string>; body?: string }) => {
        const { id, ...modifications } = args;
        const res = await api.replay(id, modifications);
        const contentType = getHeader(res.result.headers, 'content-type');
        const decoded = decodeBody(res.result.body, contentType);
        return jsonResult({
          originalId: res.originalId,
          response: {
            status: res.result.status,
            statusText: res.result.statusText,
            headers: res.result.headers,
            durationMs: res.result.duration,
            body: decoded.text,
            bodyNote: decoded.note,
          },
          comparison: res.comparison,
        });
      },
    ),
  );

  return server;
}

/**
 * Start the NectoProxy MCP server over stdio. Resolves when the transport
 * closes (i.e. the client disconnects / stdin ends).
 */
export async function startMcpServer(config: McpServerConfig): Promise<void> {
  const server = createMcpServer(config);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
