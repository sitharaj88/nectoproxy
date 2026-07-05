import type { Rule, RuleCreateInput } from '@nectoproxy/shared';

/**
 * Wire representation of a {@link TrafficEntry} as returned by the REST API.
 *
 * The server serialises request/response bodies as base64 strings (or null),
 * so this mirrors {@link TrafficEntry} but with string bodies.
 */
export interface TrafficEntryWire {
  id: string;
  sessionId: string;
  timestamp: number;
  method: string;
  url: string;
  protocol: 'http' | 'https' | 'ws' | 'wss';
  host: string;
  path: string;
  requestHeaders: Record<string, string | string[]>;
  requestBody: string | null;
  requestBodySize: number;
  status: number | null;
  statusText: string | null;
  responseHeaders: Record<string, string | string[]> | null;
  responseBody: string | null;
  responseBodySize: number | null;
  duration: number | null;
  remoteAddress: string | null;
  tlsVersion: string | null;
  error: string | null;
  isComplete: boolean;
  isMocked: boolean;
  isBreakpointed: boolean;
  isTruncated: boolean;
}

/** Result of a replay call. */
export interface ReplayResultWire {
  result: {
    status: number;
    statusText?: string;
    headers: Record<string, string | string[]>;
    body: string | null;
    duration: number;
  };
  comparison: unknown;
  originalId: string;
}

/** Filters accepted by {@link NectoApiClient.listTraffic}. */
export interface ListTrafficParams {
  limit?: number;
  offset?: number;
  methods?: string[];
  statusCodes?: number[];
  hosts?: string[];
  search?: string;
}

/** Modifications applied to a replayed request. */
export interface ReplayModifications {
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  body?: string;
}

/**
 * Error thrown by {@link NectoApiClient} with a human-friendly, actionable
 * message. `status` is the HTTP status when the API responded, or `undefined`
 * when the request never reached the server (connection refused, DNS, etc.).
 */
export class NectoApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'NectoApiError';
  }
}

/**
 * Thin typed wrapper over NectoProxy's control-plane REST API.
 *
 * All `/api/*` routes require the per-run session token (printed by
 * `nectoproxy start`) sent as `Authorization: Bearer <token>`.
 */
export class NectoApiClient {
  private readonly baseUrl: string;

  constructor(
    baseUrl: string,
    private readonly token: string,
  ) {
    // Normalise: strip a trailing slash so path joining is predictable.
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.token}`,
    };
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    let res: Response;
    try {
      res = await fetch(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      throw new NectoApiError(
        `Cannot reach the NectoProxy API at ${this.baseUrl} (${reason}). ` +
          `Make sure the proxy is running (\`nectoproxy start\`) and that ` +
          `--url / NECTO_API_URL points at its Web UI / control-plane port ` +
          `(default http://127.0.0.1:8889).`,
      );
    }

    if (res.status === 401) {
      throw new NectoApiError(
        `Unauthorized (401): the session token is missing or invalid. ` +
          `Pass the token printed by \`nectoproxy start\` via --token or the ` +
          `NECTO_TOKEN environment variable.`,
        401,
      );
    }

    if (!res.ok) {
      let detail = '';
      try {
        const data = (await res.json()) as { error?: string };
        if (data?.error) detail = `: ${data.error}`;
      } catch {
        // ignore non-JSON error bodies
      }
      throw new NectoApiError(
        `NectoProxy API request failed (${res.status} ${res.statusText})${detail} [${method} ${path}]`,
        res.status,
      );
    }

    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  /** GET /api/health — used to surface connectivity problems clearly. */
  async health(): Promise<{ status: string }> {
    return this.request('GET', '/api/health');
  }

  /** GET /api/traffic — recent captured entries (bodies base64-encoded). */
  async listTraffic(params: ListTrafficParams = {}): Promise<TrafficEntryWire[]> {
    const q = new URLSearchParams();
    if (params.limit !== undefined) q.set('limit', String(params.limit));
    if (params.offset !== undefined) q.set('offset', String(params.offset));
    if (params.search) q.set('search', params.search);
    if (params.methods?.length) q.set('methods', params.methods.join(','));
    if (params.statusCodes?.length)
      q.set('statusCodes', params.statusCodes.join(','));
    if (params.hosts?.length) q.set('hosts', params.hosts.join(','));

    const qs = q.toString();
    const data = await this.request<{ entries: TrafficEntryWire[] }>(
      'GET',
      `/api/traffic${qs ? `?${qs}` : ''}`,
    );
    return data.entries ?? [];
  }

  /** GET /api/traffic/:id — full detail for one entry. */
  async getTraffic(id: string): Promise<TrafficEntryWire> {
    return this.request('GET', `/api/traffic/${encodeURIComponent(id)}`);
  }

  /** POST /api/traffic/:id/replay — re-send a captured request. */
  async replay(
    id: string,
    modifications: ReplayModifications = {},
  ): Promise<ReplayResultWire> {
    return this.request(
      'POST',
      `/api/traffic/${encodeURIComponent(id)}/replay`,
      modifications,
    );
  }

  /** GET /api/rules — all rules. */
  async listRules(): Promise<Rule[]> {
    const data = await this.request<{ rules: Rule[] }>('GET', '/api/rules');
    return data.rules ?? [];
  }

  /** POST /api/rules — create a rule. */
  async createRule(input: RuleCreateInput): Promise<Rule> {
    return this.request('POST', '/api/rules', input);
  }

  /** PATCH /api/rules/:id/toggle — flip a rule's enabled flag. */
  async toggleRule(id: string): Promise<Rule> {
    return this.request(
      'PATCH',
      `/api/rules/${encodeURIComponent(id)}/toggle`,
    );
  }

  /** DELETE /api/rules/:id — remove a rule. */
  async deleteRule(id: string): Promise<{ success: boolean }> {
    return this.request('DELETE', `/api/rules/${encodeURIComponent(id)}`);
  }
}
