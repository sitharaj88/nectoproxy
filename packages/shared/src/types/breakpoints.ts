import type { RuleMatcher } from './rules.js';

export type BreakpointType = 'request' | 'response' | 'both';

export type BreakpointConditionField =
  | 'status'
  | 'url'
  | 'method'
  | 'header'
  | 'requestBody'
  | 'responseBody'
  | 'duration'
  | 'host';

export type BreakpointConditionOperator =
  | 'equals'
  | 'contains'
  | 'startsWith'
  | 'endsWith'
  | 'matches'
  | 'greaterThan'
  | 'lessThan';

export interface BreakpointCondition {
  field: BreakpointConditionField;
  operator: BreakpointConditionOperator;
  value: string;
  headerName?: string; // Only for field === 'header'
}

export type BreakpointConditionLogic = 'and' | 'or';

export interface Breakpoint {
  id: string;
  name: string;
  enabled: boolean;
  type: BreakpointType;
  match: RuleMatcher;
  conditions?: BreakpointCondition[];
  conditionLogic?: BreakpointConditionLogic;
  createdAt: number;
}

export interface BreakpointHit {
  id: string;
  breakpointId: string;
  trafficId: string;
  type: 'request' | 'response';
  timestamp: number;

  // Request data (always present)
  method: string;
  url: string;
  requestHeaders: Record<string, string | string[]>;
  requestBody: Buffer | null;

  // Response data (only for response breakpoints)
  status?: number;
  statusText?: string;
  responseHeaders?: Record<string, string | string[]>;
  responseBody?: Buffer | null;
}

export interface BreakpointResume {
  id: string;
  action: 'continue' | 'abort' | 'mock';

  // Modified request (for request breakpoints)
  modifiedRequest?: {
    method?: string;
    url?: string;
    headers?: Record<string, string>;
    body?: string | Buffer;
  };

  // Modified response (for response breakpoints)
  modifiedResponse?: {
    status?: number;
    statusText?: string;
    headers?: Record<string, string>;
    body?: string | Buffer;
  };

  // Mock response (for mock action)
  mockResponse?: {
    status: number;
    statusText?: string;
    headers?: Record<string, string>;
    body?: string | Buffer;
  };
}

export interface BreakpointCreateInput {
  name: string;
  enabled?: boolean;
  type: BreakpointType;
  match: RuleMatcher;
  conditions?: BreakpointCondition[];
  conditionLogic?: BreakpointConditionLogic;
}
