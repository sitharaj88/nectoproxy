import type { TrafficEntryWire } from './api.js';

/** Get a single header value case-insensitively. */
export function getHeader(
  headers: Record<string, string | string[]> | null | undefined,
  name: string,
): string | undefined {
  if (!headers) return undefined;
  const target = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === target) {
      return Array.isArray(value) ? value.join(', ') : value;
    }
  }
  return undefined;
}

const TEXT_CONTENT_TYPE = /(text\/|json|xml|javascript|ecmascript|x-www-form-urlencoded|html|csv|graphql|yaml)/i;

/** Heuristic: does this content-type describe textual content? */
export function isTextualContentType(contentType: string | undefined): boolean {
  if (!contentType) return false;
  return TEXT_CONTENT_TYPE.test(contentType);
}

/**
 * Decode a base64 body into text when it plausibly is text, otherwise return a
 * short binary placeholder. `contentType` biases the decision but a clean UTF-8
 * decode is also accepted.
 */
export function decodeBody(
  base64: string | null,
  contentType: string | undefined,
): { text: string | null; note?: string } {
  if (!base64) return { text: null };
  const buf = Buffer.from(base64, 'base64');
  if (buf.length === 0) return { text: '' };

  const looksText = isTextualContentType(contentType);
  const decoded = buf.toString('utf-8');
  // Count U+FFFD replacement chars — a strong signal of a bad text decode.
  const replacementChars = (decoded.match(/�/g) ?? []).length;
  const suspicious = replacementChars / decoded.length > 0.02;

  if (looksText || !suspicious) {
    return { text: decoded };
  }
  return {
    text: null,
    note: `<binary ${buf.length} bytes${contentType ? `, ${contentType}` : ''} — not shown>`,
  };
}

/** Compact one-line-per-field summary of a traffic entry for list views. */
export interface TrafficSummary {
  id: string;
  method: string;
  url: string;
  host: string;
  status: number | null;
  statusText: string | null;
  durationMs: number | null;
  requestBytes: number;
  responseBytes: number | null;
  contentType?: string;
  error: string | null;
  isMocked: boolean;
  timestamp: number;
}

export function toSummary(entry: TrafficEntryWire): TrafficSummary {
  return {
    id: entry.id,
    method: entry.method,
    url: entry.url,
    host: entry.host,
    status: entry.status,
    statusText: entry.statusText,
    durationMs: entry.duration,
    requestBytes: entry.requestBodySize,
    responseBytes: entry.responseBodySize,
    contentType: getHeader(entry.responseHeaders, 'content-type'),
    error: entry.error,
    isMocked: entry.isMocked,
    timestamp: entry.timestamp,
  };
}
