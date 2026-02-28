import type {
  TrafficEntry,
  Session,
  TrafficStats,
  Rule,
  RuleCreateInput,
  RuleUpdateInput,
  Breakpoint,
  BreakpointCreateInput,
  DnsMapping,
  DnsMappingCreateInput,
  DnsMappingUpdateInput,
  Annotation,
  AnnotationCreateInput,
  AnnotationUpdateInput,
} from '@nectoproxy/shared';

const API_BASE = '/api';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// Traffic API
export interface TrafficResponse {
  entries: Array<TrafficEntry & { requestBody: string | null; responseBody: string | null }>;
  count: number;
}

// Global Search API
export interface GlobalSearchParams {
  query: string;
  searchIn?: string[];
  methods?: string[];
  statusCodes?: string[];
  limit?: number;
  offset?: number;
}

export interface GlobalSearchResult {
  entries: Array<TrafficEntry & { requestBody: string | null; responseBody: string | null }>;
  total: number;
  sessionNames: Record<string, string>;
}

export async function searchTrafficGlobal(params: GlobalSearchParams): Promise<GlobalSearchResult> {
  const searchParams = new URLSearchParams();
  searchParams.set('q', params.query);
  if (params.searchIn && params.searchIn.length > 0) searchParams.set('searchIn', params.searchIn.join(','));
  if (params.methods && params.methods.length > 0) searchParams.set('methods', params.methods.join(','));
  if (params.statusCodes && params.statusCodes.length > 0) searchParams.set('statusCodes', params.statusCodes.join(','));
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.offset) searchParams.set('offset', String(params.offset));
  return fetchJson<GlobalSearchResult>(`/traffic/search?${searchParams.toString()}`);
}

export async function getTraffic(params?: {
  sessionId?: string;
  limit?: number;
  offset?: number;
  search?: string;
}): Promise<TrafficResponse> {
  const searchParams = new URLSearchParams();
  if (params?.sessionId) searchParams.set('sessionId', params.sessionId);
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.offset) searchParams.set('offset', String(params.offset));
  if (params?.search) searchParams.set('search', params.search);

  const query = searchParams.toString();
  return fetchJson<TrafficResponse>(`/traffic${query ? `?${query}` : ''}`);
}

export async function getTrafficEntry(id: string): Promise<TrafficEntry & { requestBody: string | null; responseBody: string | null }> {
  return fetchJson(`/traffic/${id}`);
}

export async function getTrafficStats(sessionId: string): Promise<TrafficStats> {
  return fetchJson(`/traffic/stats/${sessionId}`);
}

export async function deleteTraffic(id: string): Promise<void> {
  await fetchJson(`/traffic/${id}`, { method: 'DELETE' });
}

export async function clearTraffic(sessionId: string): Promise<void> {
  await fetchJson(`/traffic/session/${sessionId}`, { method: 'DELETE' });
}

// Sessions API
export interface SessionsResponse {
  sessions: Session[];
}

export async function getSessions(): Promise<SessionsResponse> {
  return fetchJson('/sessions');
}

export async function getActiveSession(): Promise<Session> {
  return fetchJson('/sessions/active');
}

export async function createSession(name: string): Promise<Session> {
  return fetchJson('/sessions', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export async function activateSession(id: string): Promise<Session> {
  return fetchJson(`/sessions/${id}/activate`, { method: 'POST' });
}

export async function deleteSession(id: string): Promise<void> {
  await fetchJson(`/sessions/${id}`, { method: 'DELETE' });
}

// Certificates API
export function getCACertificateUrl(): string {
  return `${API_BASE}/certificates/ca`;
}

export function getCACertificateDownloadUrl(): string {
  return `${API_BASE}/certificates/download`;
}

export async function getCACertificateInfo(): Promise<{ fingerprint: string; path: string }> {
  return fetchJson('/certificates/ca/info');
}

export async function getCertificateInstructions(): Promise<{ instructions: string }> {
  return fetchJson('/certificates/ca/install');
}

// Health API
export async function getHealth(): Promise<{ status: string; timestamp: number; connectedClients: number }> {
  return fetchJson('/health');
}

// Rules API
export interface RulesResponse {
  rules: Rule[];
}

export async function getRules(): Promise<RulesResponse> {
  return fetchJson('/rules');
}

export async function getRule(id: string): Promise<Rule> {
  return fetchJson(`/rules/${id}`);
}

export async function createRule(input: RuleCreateInput): Promise<Rule> {
  return fetchJson('/rules', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateRule(id: string, input: RuleUpdateInput): Promise<Rule> {
  return fetchJson(`/rules/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export async function toggleRule(id: string): Promise<Rule> {
  return fetchJson(`/rules/${id}/toggle`, { method: 'PATCH' });
}

export async function deleteRule(id: string): Promise<void> {
  await fetchJson(`/rules/${id}`, { method: 'DELETE' });
}

export async function reorderRules(orderedIds: string[]): Promise<RulesResponse> {
  return fetchJson('/rules/reorder', {
    method: 'POST',
    body: JSON.stringify({ orderedIds }),
  });
}

// Breakpoints API
export interface BreakpointsResponse {
  breakpoints: Breakpoint[];
}

export async function getBreakpoints(): Promise<BreakpointsResponse> {
  return fetchJson('/breakpoints');
}

export async function getBreakpoint(id: string): Promise<Breakpoint> {
  return fetchJson(`/breakpoints/${id}`);
}

export async function createBreakpoint(input: BreakpointCreateInput): Promise<Breakpoint> {
  return fetchJson('/breakpoints', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateBreakpoint(
  id: string,
  input: Partial<BreakpointCreateInput>
): Promise<Breakpoint> {
  return fetchJson(`/breakpoints/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export async function toggleBreakpoint(id: string): Promise<Breakpoint> {
  return fetchJson(`/breakpoints/${id}/toggle`, { method: 'PATCH' });
}

export async function deleteBreakpoint(id: string): Promise<void> {
  await fetchJson(`/breakpoints/${id}`, { method: 'DELETE' });
}

// Settings API
export interface AppSettings {
  proxyPort: number;
  uiPort: number;
  recording: boolean;
  autoOpenBrowser: boolean;
  theme: 'light' | 'dark' | 'system';
  maxBodySize: number;
  requestTimeout: number;
  breakpointTimeout: number;
}

export interface SettingsResponse {
  settings: AppSettings;
}

export async function getSettings(): Promise<SettingsResponse> {
  return fetchJson('/settings');
}

export async function updateSettings(settings: Partial<AppSettings>): Promise<SettingsResponse> {
  return fetchJson('/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
}

export async function updateSetting<K extends keyof AppSettings>(
  key: K,
  value: AppSettings[K]
): Promise<{ key: K; value: AppSettings[K] }> {
  return fetchJson(`/settings/${key}`, {
    method: 'PUT',
    body: JSON.stringify({ value }),
  });
}

export async function resetSettings(): Promise<SettingsResponse> {
  return fetchJson('/settings/reset', { method: 'POST' });
}

// WebSocket Frames API
export interface WebSocketFrameResponse {
  id: string;
  trafficId: string;
  timestamp: number;
  direction: 'client-to-server' | 'server-to-client';
  opcode: number;
  data: string | null; // base64 encoded
  isBinary: boolean;
  length: number;
}

export async function getWebSocketFrames(
  trafficId: string,
  limit?: number
): Promise<WebSocketFrameResponse[]> {
  const params = limit ? `?limit=${limit}` : '';
  return fetchJson(`/websocket/${trafficId}/frames${params}`);
}

export async function getWebSocketFrame(id: string): Promise<WebSocketFrameResponse> {
  return fetchJson(`/websocket/frame/${id}`);
}

export async function getWebSocketFrameCount(
  trafficId: string
): Promise<{ count: number }> {
  return fetchJson(`/websocket/${trafficId}/count`);
}

// HAR Export/Import API
export function getHARExportUrl(sessionId: string): string {
  return `${API_BASE}/har/export/${sessionId}`;
}

// Snapshot Export API
export function getSnapshotUrl(sessionId: string): string {
  return `${API_BASE}/snapshot/${sessionId}`;
}

export async function exportSelectedAsSnapshot(
  entryIds: string[],
  sessionName?: string
): Promise<Blob> {
  const response = await fetch(`${API_BASE}/snapshot/selected`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ entryIds, sessionName }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.blob();
}

export async function exportSelectedAsHAR(
  entryIds: string[],
  sessionName?: string
): Promise<Blob> {
  const response = await fetch(`${API_BASE}/har/export`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ entryIds, sessionName }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.blob();
}

export interface HARImportResult {
  success: boolean;
  imported: number;
  total: number;
  sessionId: string;
  sessionName: string;
}

export async function importHAR(
  file: File,
  sessionId?: string
): Promise<HARImportResult> {
  const formData = new FormData();
  formData.append('file', file);
  if (sessionId) {
    formData.append('sessionId', sessionId);
  }

  const response = await fetch(`${API_BASE}/har/import`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export interface HARValidationResult {
  valid: boolean;
  error?: string;
  version?: string;
  creator?: { name: string; version: string };
  entryCount?: number;
}

export async function validateHAR(file: File): Promise<HARValidationResult> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/har/validate`, {
    method: 'POST',
    body: formData,
  });

  return response.json();
}

// Replay API
export interface ReplayChange {
  type: 'status' | 'header' | 'body_size' | 'body';
  field: string;
  original: string;
  replayed: string;
}

export interface ReplayComparison {
  identical: boolean;
  changes: ReplayChange[];
  originalDuration: number;
  replayDuration: number;
}

export interface ReplayResult {
  status: number;
  statusText: string;
  headers: Record<string, string | string[]>;
  body: string | null; // base64 encoded
  duration: number;
  error?: string;
}

export interface ReplayResponse {
  result: ReplayResult;
  comparison: ReplayComparison;
  originalId: string;
}

export async function replayTrafficEntry(
  id: string,
  modifications?: {
    method?: string;
    url?: string;
    headers?: Record<string, string>;
    body?: string;
  }
): Promise<ReplayResponse> {
  return fetchJson(`/traffic/${id}/replay`, {
    method: 'POST',
    body: JSON.stringify(modifications || {}),
  });
}

export async function executeRequest(request: {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: string;
  timeout?: number;
}): Promise<ReplayResult> {
  return fetchJson('/traffic/replay', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

// Network Conditioning API
export interface NetworkProfile {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  downloadBandwidth: number;
  uploadBandwidth: number;
  latency: number;
  latencyJitter: number;
  packetLoss: number;
  isPreset: boolean;
}

export interface NetworkProfilesResponse {
  profiles: NetworkProfile[];
  activeProfile: NetworkProfile | null;
}

export async function getNetworkProfiles(): Promise<NetworkProfilesResponse> {
  return fetchJson('/network/profiles');
}

export async function getActiveNetworkProfile(): Promise<{ activeProfile: NetworkProfile | null }> {
  return fetchJson('/network/active');
}

export async function activateNetworkProfile(id: string): Promise<{ activeProfile: NetworkProfile }> {
  return fetchJson(`/network/activate/${id}`, { method: 'POST' });
}

export async function deactivateNetworkProfile(): Promise<{ activeProfile: null }> {
  return fetchJson('/network/deactivate', { method: 'POST' });
}

export async function createNetworkProfile(
  profile: Omit<NetworkProfile, 'id' | 'isPreset'>
): Promise<NetworkProfile> {
  return fetchJson('/network/profiles', {
    method: 'POST',
    body: JSON.stringify(profile),
  });
}

export async function updateNetworkProfile(
  id: string,
  profile: Partial<NetworkProfile>
): Promise<NetworkProfile> {
  return fetchJson(`/network/profiles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(profile),
  });
}

export async function deleteNetworkProfile(id: string): Promise<void> {
  await fetchJson(`/network/profiles/${id}`, { method: 'DELETE' });
}

// Upstream Proxy API
export type UpstreamProxyType = 'http' | 'https' | 'socks4' | 'socks5';

export interface UpstreamProxyConfig {
  enabled: boolean;
  type: UpstreamProxyType;
  host: string;
  port: number;
  auth?: {
    username: string;
    password: string;
  };
  bypassRules: string[];
}

export interface UpstreamProxyResponse {
  config: UpstreamProxyConfig | null;
}

export async function getUpstreamProxyConfig(): Promise<UpstreamProxyResponse> {
  return fetchJson('/upstream-proxy');
}

export async function updateUpstreamProxyConfig(
  config: Partial<UpstreamProxyConfig>
): Promise<UpstreamProxyResponse> {
  return fetchJson('/upstream-proxy', {
    method: 'PUT',
    body: JSON.stringify(config),
  });
}

export async function enableUpstreamProxy(): Promise<UpstreamProxyResponse> {
  return fetchJson('/upstream-proxy/enable', { method: 'POST' });
}

export async function disableUpstreamProxy(): Promise<UpstreamProxyResponse> {
  return fetchJson('/upstream-proxy/disable', { method: 'POST' });
}

export async function clearUpstreamProxy(): Promise<UpstreamProxyResponse> {
  return fetchJson('/upstream-proxy', { method: 'DELETE' });
}

// Local IP addresses API
export interface LocalIPAddress {
  name: string;
  address: string;
  family: string;
}

export interface LocalIPsResponse {
  addresses: LocalIPAddress[];
}

export async function getLocalIPs(): Promise<LocalIPsResponse> {
  return fetchJson('/network/local-ips');
}

// SSL Passthrough API
export interface SSLPassthroughDomainsResponse {
  domains: SSLPassthroughDomain[];
}

export interface SSLPassthroughDomain {
  id: string;
  domain: string;
  enabled: boolean;
  reason?: string;
  createdAt: number;
}

export interface SSLPassthroughCreateInput {
  domain: string;
  enabled?: boolean;
  reason?: string;
}

export async function getSSLPassthroughDomains(): Promise<SSLPassthroughDomainsResponse> {
  return fetchJson('/ssl-passthrough');
}

export async function addSSLPassthroughDomain(
  input: SSLPassthroughCreateInput
): Promise<SSLPassthroughDomain> {
  return fetchJson('/ssl-passthrough', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function deleteSSLPassthroughDomain(id: string): Promise<void> {
  await fetchJson(`/ssl-passthrough/${id}`, { method: 'DELETE' });
}

export async function toggleSSLPassthroughDomain(
  id: string
): Promise<SSLPassthroughDomain> {
  return fetchJson(`/ssl-passthrough/${id}/toggle`, { method: 'PATCH' });
}

export async function checkSSLPassthroughDomain(
  domain: string
): Promise<{ domain: string; matches: boolean }> {
  return fetchJson('/ssl-passthrough/check', {
    method: 'POST',
    body: JSON.stringify({ domain }),
  });
}

// DNS Mapping API
export interface DnsMappingResponse {
  mappings: DnsMapping[];
}

export async function getDnsMappings(): Promise<DnsMappingResponse> {
  return fetchJson('/dns');
}

export async function createDnsMapping(input: DnsMappingCreateInput): Promise<DnsMapping> {
  return fetchJson('/dns', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateDnsMapping(id: string, input: DnsMappingUpdateInput): Promise<DnsMapping> {
  return fetchJson(`/dns/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export async function toggleDnsMapping(id: string): Promise<DnsMapping> {
  return fetchJson(`/dns/${id}/toggle`, { method: 'PATCH' });
}

export async function deleteDnsMapping(id: string): Promise<void> {
  await fetchJson(`/dns/${id}`, { method: 'DELETE' });
}

export async function resolveDnsMapping(
  hostname: string
): Promise<{ hostname: string; resolvedIp: string | null; matched: boolean }> {
  return fetchJson('/dns/resolve', {
    method: 'POST',
    body: JSON.stringify({ hostname }),
  });
}

// Annotations API
export async function getAnnotations(
  trafficId: string
): Promise<{ annotations: Annotation[] }> {
  return fetchJson(`/annotations/traffic/${trafficId}`);
}

export async function createAnnotation(
  input: AnnotationCreateInput
): Promise<Annotation> {
  return fetchJson('/annotations', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateAnnotation(
  id: string,
  input: AnnotationUpdateInput
): Promise<Annotation> {
  return fetchJson(`/annotations/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export async function deleteAnnotation(id: string): Promise<void> {
  await fetchJson(`/annotations/${id}`, { method: 'DELETE' });
}
