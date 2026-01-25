import type { GeneratorInput, GeneratorOutput } from './types';

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
  const headers = entry.requestHeaders || {};
  const skipHeaders = ['host', 'content-length', 'connection'];

  for (const [key, value] of Object.entries(headers)) {
    if (skipHeaders.includes(key.toLowerCase())) continue;
    const headerValue = Array.isArray(value) ? value.join(', ') : value;
    lines.push(`  -H '${key}: ${headerValue}'`);
  }

  // Add body if present
  if (requestBody && ['POST', 'PUT', 'PATCH'].includes(method)) {
    // Escape single quotes in the body
    const escapedBody = requestBody.replace(/'/g, "'\\''");

    // Check if it's JSON
    const contentType = headers['content-type'] || headers['Content-Type'] || '';
    if (contentType.includes('application/json')) {
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
