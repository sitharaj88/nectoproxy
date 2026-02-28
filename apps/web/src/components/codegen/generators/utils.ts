/**
 * Headers that should be excluded from generated code.
 * These are hop-by-hop headers or headers automatically managed by HTTP clients.
 */
export const SKIP_HEADERS = new Set([
  'host',
  'connection',
  'proxy-connection',
  'proxy-authorization',
  'transfer-encoding',
  'content-length',
  'keep-alive',
  'upgrade',
  'http2-settings',
]);

/**
 * Check if a header should be skipped in generated code.
 */
export function shouldSkipHeader(headerName: string): boolean {
  return SKIP_HEADERS.has(headerName.toLowerCase());
}

/**
 * Filter headers, removing hop-by-hop and automatically-managed headers.
 * Returns a plain Record with string values (arrays joined with ', ').
 */
export function filterHeaders(
  headers: Record<string, string | string[]> | undefined
): Record<string, string> {
  const result: Record<string, string> = {};
  if (!headers) return result;

  for (const [key, value] of Object.entries(headers)) {
    if (shouldSkipHeader(key)) continue;
    result[key] = Array.isArray(value) ? value.join(', ') : value;
  }

  return result;
}

/**
 * Decode a request body from various formats into a string.
 * Bodies may be Buffer objects, base64 strings, ArrayBuffers, or Uint8Arrays.
 */
export function bodyToString(body: unknown): string | null {
  if (!body) return null;

  if (typeof body === 'string') {
    try {
      return atob(body);
    } catch {
      return body;
    }
  }

  if (body instanceof ArrayBuffer) {
    return new TextDecoder().decode(body);
  }

  if (body instanceof Uint8Array) {
    return new TextDecoder().decode(body);
  }

  if (
    typeof body === 'object' &&
    body !== null &&
    'type' in body &&
    (body as Record<string, unknown>).type === 'Buffer'
  ) {
    return new TextDecoder().decode(
      new Uint8Array((body as Record<string, unknown>).data as number[])
    );
  }

  return JSON.stringify(body);
}

/**
 * Get the content-type header value from a headers record (case-insensitive).
 */
export function getContentType(
  headers: Record<string, string | string[]> | undefined
): string {
  if (!headers) return '';
  return (
    (headers['content-type'] as string) ||
    (headers['Content-Type'] as string) ||
    ''
  );
}

/**
 * Determine if the content type indicates JSON.
 */
export function isJsonContentType(contentType: string): boolean {
  return contentType.includes('application/json');
}
