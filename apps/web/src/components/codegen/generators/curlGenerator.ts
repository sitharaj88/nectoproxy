import type { GeneratorInput, GeneratorOutput } from './types';
import { filterHeaders, getContentType, isJsonContentType } from './utils';

export function generateCurl({ entry, requestBody }: GeneratorInput): GeneratorOutput {
  const lines: string[] = [];

  // Start with curl command and method
  const method = entry.method.toUpperCase();
  if (method === 'GET') {
    lines.push(`curl '${entry.url}'`);
  } else {
    lines.push(`curl -X ${method} '${entry.url}'`);
  }

  // Add headers
  const filteredHeaders = filterHeaders(entry.requestHeaders);

  for (const [key, value] of Object.entries(filteredHeaders)) {
    lines.push(`  -H '${key}: ${value}'`);
  }

  // Add body if present
  if (requestBody && ['POST', 'PUT', 'PATCH'].includes(method)) {
    // Escape single quotes in the body
    const escapedBody = requestBody.replace(/'/g, "'\\''");

    // Check if it's JSON
    const contentType = getContentType(entry.requestHeaders);
    if (isJsonContentType(contentType)) {
      try {
        // Pretty format for readability, then compact for curl
        const parsed = JSON.parse(requestBody);
        lines.push(`  -d '${JSON.stringify(parsed)}'`);
      } catch {
        lines.push(`  -d '${escapedBody}'`);
      }
    } else {
      lines.push(`  -d '${escapedBody}'`);
    }
  }

  // Join with backslash for line continuation
  const code = lines.join(' \\\n');

  return {
    code,
    language: 'cURL',
    syntaxHighlight: 'bash',
  };
}
