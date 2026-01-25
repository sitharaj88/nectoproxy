export type RuleAction =
  | 'mock'
  | 'map-local'
  | 'map-remote'
  | 'modify-request'
  | 'modify-response'
  | 'delay'
  | 'throttle'
  | 'block';

export interface RuleMatcher {
  url?: string | RegExp;
  method?: string | string[];
  host?: string;
  path?: string | RegExp;
  headers?: Record<string, string | RegExp>;
  bodyContains?: string;
}

export interface MockResponse {
  status: number;
  statusText?: string;
  headers?: Record<string, string>;
  body?: string | Buffer;
  bodyFile?: string;
  delay?: number;
}

export interface MapLocalConfig {
  localPath: string;
  preserveHost?: boolean;
}

export interface MapRemoteConfig {
  targetUrl: string;
  preservePath?: boolean;
  preserveQuery?: boolean;
}

export interface ModifyRequestConfig {
  setHeaders?: Record<string, string>;
  removeHeaders?: string[];
  setQueryParams?: Record<string, string>;
  removeQueryParams?: string[];
  replaceBody?: string | Buffer;
  transformBody?: string; // JavaScript function as string
}

export interface ModifyResponseConfig {
  setStatus?: number;
  setHeaders?: Record<string, string>;
  removeHeaders?: string[];
  replaceBody?: string | Buffer;
  transformBody?: string;
}

export interface DelayConfig {
  delay: number; // milliseconds
  variance?: number; // random variance +/-
}

export interface ThrottleConfig {
  bytesPerSecond: number;
  latency?: number;
}

export interface Rule {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  match: RuleMatcher;
  action: RuleAction;
  config: MockResponse | MapLocalConfig | MapRemoteConfig | ModifyRequestConfig | ModifyResponseConfig | DelayConfig | ThrottleConfig | null;
  createdAt: number;
  updatedAt: number;
}

export interface RuleCreateInput {
  name: string;
  enabled?: boolean;
  priority?: number;
  match: RuleMatcher;
  action: RuleAction;
  config?: Rule['config'];
}

export interface RuleUpdateInput {
  name?: string;
  enabled?: boolean;
  priority?: number;
  match?: RuleMatcher;
  action?: RuleAction;
  config?: Rule['config'];
}
