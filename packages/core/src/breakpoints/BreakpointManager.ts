import { EventEmitter } from 'node:events';
import { v4 as uuid } from 'uuid';
import type {
  Breakpoint,
  BreakpointCondition,
  BreakpointConditionLogic,
  BreakpointHit,
  BreakpointResume,
} from '@proxyscope/shared';
import { RuleMatcherEngine, type MatchContext } from '../rules/RuleMatcher.js';

interface PendingBreakpoint {
  hit: BreakpointHit;
  resolve: (resume: BreakpointResume) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}

export interface BreakpointManagerConfig {
  defaultTimeout: number; // milliseconds, 0 = no timeout
  autoAction: 'continue' | 'abort'; // what to do on timeout
}

export interface ResponseContext {
  status: number;
  statusText?: string;
  headers: Record<string, string | string[]>;
  body: Buffer | null;
  duration?: number;
}

const DEFAULT_CONFIG: BreakpointManagerConfig = {
  defaultTimeout: 30000, // 30 seconds
  autoAction: 'continue',
};

export class BreakpointManager extends EventEmitter {
  private breakpoints: Map<string, Breakpoint> = new Map();
  private pendingHits: Map<string, PendingBreakpoint> = new Map();
  private matcher = new RuleMatcherEngine();
  private config: BreakpointManagerConfig;

  constructor(config: Partial<BreakpointManagerConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  setBreakpoints(breakpoints: Breakpoint[]): void {
    this.breakpoints.clear();
    for (const bp of breakpoints) {
      this.breakpoints.set(bp.id, bp);
    }
  }

  addBreakpoint(breakpoint: Breakpoint): void {
    this.breakpoints.set(breakpoint.id, breakpoint);
  }

  removeBreakpoint(id: string): void {
    this.breakpoints.delete(id);
  }

  updateBreakpoint(id: string, updates: Partial<Breakpoint>): void {
    const existing = this.breakpoints.get(id);
    if (existing) {
      this.breakpoints.set(id, { ...existing, ...updates });
    }
  }

  getBreakpoints(): Breakpoint[] {
    return Array.from(this.breakpoints.values());
  }

  shouldBreak(
    ctx: MatchContext,
    phase: 'request' | 'response',
    responseCtx?: ResponseContext
  ): Breakpoint | null {
    for (const breakpoint of this.breakpoints.values()) {
      if (!breakpoint.enabled) continue;

      // Check if breakpoint type matches the phase
      if (breakpoint.type !== 'both' && breakpoint.type !== phase) continue;

      // Check if pattern matches
      if (!this.matcher.matchesContext(breakpoint.match, ctx)) continue;

      // Check conditions if they exist
      if (breakpoint.conditions && breakpoint.conditions.length > 0) {
        const logic = breakpoint.conditionLogic || 'and';
        if (!this.evaluateConditions(breakpoint.conditions, logic, ctx, responseCtx)) {
          continue;
        }
      }

      return breakpoint;
    }
    return null;
  }

  private evaluateConditions(
    conditions: BreakpointCondition[],
    logic: BreakpointConditionLogic,
    ctx: MatchContext,
    responseCtx?: ResponseContext
  ): boolean {
    if (logic === 'and') {
      return conditions.every((condition) =>
        this.evaluateCondition(condition, ctx, responseCtx)
      );
    }
    return conditions.some((condition) =>
      this.evaluateCondition(condition, ctx, responseCtx)
    );
  }

  private evaluateCondition(
    condition: BreakpointCondition,
    ctx: MatchContext,
    responseCtx?: ResponseContext
  ): boolean {
    const fieldValue = this.getConditionFieldValue(condition, ctx, responseCtx);
    if (fieldValue === null || fieldValue === undefined) {
      return false;
    }

    const { operator, value } = condition;

    // Numeric operators
    if (operator === 'greaterThan' || operator === 'lessThan') {
      const numFieldValue = Number(fieldValue);
      const numConditionValue = Number(value);
      if (isNaN(numFieldValue) || isNaN(numConditionValue)) {
        return false;
      }
      return operator === 'greaterThan'
        ? numFieldValue > numConditionValue
        : numFieldValue < numConditionValue;
    }

    // String operators
    const strFieldValue = String(fieldValue);

    switch (operator) {
      case 'equals':
        return strFieldValue === value;
      case 'contains':
        return strFieldValue.includes(value);
      case 'startsWith':
        return strFieldValue.startsWith(value);
      case 'endsWith':
        return strFieldValue.endsWith(value);
      case 'matches':
        try {
          const regex = new RegExp(value);
          return regex.test(strFieldValue);
        } catch {
          return false;
        }
      default:
        return false;
    }
  }

  private getConditionFieldValue(
    condition: BreakpointCondition,
    ctx: MatchContext,
    responseCtx?: ResponseContext
  ): string | number | null {
    switch (condition.field) {
      case 'url':
        return ctx.url;
      case 'method':
        return ctx.method;
      case 'host':
        return ctx.host;
      case 'status':
        return responseCtx?.status ?? null;
      case 'duration':
        return responseCtx?.duration ?? null;
      case 'header': {
        if (!condition.headerName) return null;
        // Check request headers first, then response headers
        const reqValue = this.getHeaderValue(ctx.requestHeaders, condition.headerName);
        if (reqValue !== null) return reqValue;
        if (responseCtx?.headers) {
          return this.getHeaderValue(responseCtx.headers, condition.headerName);
        }
        return null;
      }
      case 'requestBody': {
        if (!ctx.requestBody) return null;
        return ctx.requestBody.toString('utf-8');
      }
      case 'responseBody': {
        if (!responseCtx?.body) return null;
        return responseCtx.body.toString('utf-8');
      }
      default:
        return null;
    }
  }

  private getHeaderValue(
    headers: Record<string, string | string[]>,
    headerName: string
  ): string | null {
    const normalizedKey = headerName.toLowerCase();
    for (const [key, value] of Object.entries(headers)) {
      if (key.toLowerCase() === normalizedKey) {
        return Array.isArray(value) ? value.join(', ') : value;
      }
    }
    return null;
  }

  async waitForResume(
    hit: BreakpointHit,
    timeout?: number
  ): Promise<BreakpointResume> {
    return new Promise((resolve, reject) => {
      const effectiveTimeout = timeout ?? this.config.defaultTimeout;

      // Set up timeout
      const timeoutHandle = effectiveTimeout > 0
        ? setTimeout(() => this.handleTimeout(hit.id), effectiveTimeout)
        : (null as unknown as NodeJS.Timeout);

      // Store pending breakpoint
      this.pendingHits.set(hit.id, {
        hit,
        resolve,
        reject,
        timeout: timeoutHandle,
      });

      // Emit hit event
      this.emit('breakpoint:hit', hit);
    });
  }

  resume(hitId: string, resume: BreakpointResume): void {
    const pending = this.pendingHits.get(hitId);
    if (!pending) {
      console.warn(`No pending breakpoint found for id: ${hitId}`);
      return;
    }

    // Clear timeout
    if (pending.timeout) {
      clearTimeout(pending.timeout);
    }

    // Remove from pending
    this.pendingHits.delete(hitId);

    // Emit resumed event
    this.emit('breakpoint:resumed', hitId);

    // Resolve the promise
    pending.resolve(resume);
  }

  private handleTimeout(hitId: string): void {
    const pending = this.pendingHits.get(hitId);
    if (!pending) return;

    // Remove from pending
    this.pendingHits.delete(hitId);

    // Emit timeout event
    this.emit('breakpoint:timeout', hitId);

    // Auto-resolve based on config
    pending.resolve({
      id: hitId,
      action: this.config.autoAction,
    });
  }

  getPendingHits(): BreakpointHit[] {
    return Array.from(this.pendingHits.values()).map((p) => p.hit);
  }

  cancelPending(hitId: string): void {
    const pending = this.pendingHits.get(hitId);
    if (!pending) return;

    // Clear timeout
    if (pending.timeout) {
      clearTimeout(pending.timeout);
    }

    // Remove from pending
    this.pendingHits.delete(hitId);

    // Reject the promise
    pending.reject(new Error('Breakpoint cancelled'));
  }

  cancelAllPending(): void {
    for (const [hitId] of this.pendingHits) {
      this.cancelPending(hitId);
    }
  }

  createBreakpointHit(
    breakpoint: Breakpoint,
    trafficId: string,
    type: 'request' | 'response',
    ctx: MatchContext,
    response?: {
      status: number;
      statusText?: string;
      headers: Record<string, string | string[]>;
      body: Buffer | null;
    }
  ): BreakpointHit {
    return {
      id: uuid(),
      breakpointId: breakpoint.id,
      trafficId,
      type,
      timestamp: Date.now(),
      method: ctx.method,
      url: ctx.url,
      requestHeaders: ctx.requestHeaders,
      requestBody: ctx.requestBody || null,
      status: response?.status,
      statusText: response?.statusText,
      responseHeaders: response?.headers,
      responseBody: response?.body,
    };
  }
}
