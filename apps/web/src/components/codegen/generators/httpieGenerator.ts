import type { GeneratorInput, GeneratorOutput } from './types';
import { filterHeaders, getContentType, isJsonContentType } from './utils';

export function generateHttpie({ entry, requestBody }: GeneratorInput): GeneratorOutput {
  const lines: string[] = [];

  const method = entry.method.toUpperCase();
  const filteredHeaders = filterHeaders(entry.requestHeaders);
  const contentType = getContentType(entry.requestHeaders);
  const isJson = isJsonContentType(contentType);
  const hasBody = requestBody && ['POST', 'PUT', 'PATCH'].includes(method);

  // HTTPie command - GET is default so we can omit it
  if (method === 'GET') {
    lines.push(`http ${entry.url}`);
  } else {
    lines.push(`http ${method} ${entry.url}`);
  }

  // Add headers (key:value format)
  for (const [key, value] of Object.entries(filteredHeaders)) {
    // Values with spaces need quoting
    if (value.includes(' ') || value.includes('"')) {
      lines.push(`  ${key}:"${value.replace(/"/g, '\\"')}"`);
    } else {
      lines.push(`  ${key}:${value}`);
    }
  }

  // Add body
  if (hasBody) {
    if (isJson) {
      try {
        const parsed = JSON.parse(requestBody);
        // HTTPie supports inline JSON with := for non-string and = for string fields
        for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
          if (typeof value === 'string') {
            lines.push(`  ${key}="${value.replace(/"/g, '\\"')}"`);
          } else {
            lines.push(`  ${key}:=${JSON.stringify(value)}`);
          }
        }
      } catch {
        // Fallback: pass raw body
        const escapedBody = requestBody.replace(/'/g, "'\\''");
        lines[0] = `echo '${escapedBody}' | ${lines[0]}`;
      }
    } else {
      // For non-JSON bodies, pipe through stdin
      const escapedBody = requestBody.replace(/'/g, "'\\''");
      lines[0] = `echo '${escapedBody}' | ${lines[0]}`;
    }
  }

  // Join with backslash for line continuation
  const code = lines.join(' \\\n');

  return {
    code,
    language: 'HTTPie',
    syntaxHighlight: 'bash',
  };
}
