import type { GeneratorInput, GeneratorOutput } from './types';
import { filterHeaders, getContentType, isJsonContentType } from './utils';

export function generateNodeFetch({ entry, requestBody }: GeneratorInput): GeneratorOutput {
  const lines: string[] = [];

  // Headers
  const filteredHeaders = filterHeaders(entry.requestHeaders);

  // Build options object
  const method = entry.method.toUpperCase();
  const hasBody = requestBody && ['POST', 'PUT', 'PATCH'].includes(method);
  const contentType = getContentType(entry.requestHeaders);
  const isJson = isJsonContentType(contentType);

  lines.push(`const url = '${entry.url}';`);
  lines.push('');

  // Options
  lines.push('const options = {');
  lines.push(`  method: '${method}',`);

  if (Object.keys(filteredHeaders).length > 0) {
    lines.push('  headers: {');
    for (const [key, value] of Object.entries(filteredHeaders)) {
      lines.push(`    '${key}': '${value}',`);
    }
    lines.push('  },');
  }

  if (hasBody) {
    if (isJson) {
      try {
        const parsed = JSON.parse(requestBody);
        lines.push(`  body: JSON.stringify(${formatJsObject(parsed, 2)}),`);
      } catch {
        lines.push(`  body: ${JSON.stringify(requestBody)},`);
      }
    } else {
      lines.push(`  body: ${JSON.stringify(requestBody)},`);
    }
  }

  lines.push('};');
  lines.push('');

  // Fetch call with async/await
  lines.push('async function makeRequest() {');
  lines.push('  try {');
  lines.push('    const response = await fetch(url, options);');
  lines.push('    const data = await response.json();');
  lines.push('    console.log(\'Status:\', response.status);');
  lines.push('    console.log(\'Response:\', data);');
  lines.push('    return data;');
  lines.push('  } catch (error) {');
  lines.push('    console.error(\'Error:\', error);');
  lines.push('    throw error;');
  lines.push('  }');
  lines.push('}');
  lines.push('');
  lines.push('makeRequest();');

  return {
    code: lines.join('\n'),
    language: 'Node.js (fetch)',
    syntaxHighlight: 'javascript',
  };
}

function formatJsObject(obj: unknown, indent = 0): string {
  const spaces = '  '.repeat(indent);
  const innerSpaces = '  '.repeat(indent + 1);

  if (obj === null) return 'null';
  if (typeof obj === 'boolean') return String(obj);
  if (typeof obj === 'number') return String(obj);
  if (typeof obj === 'string') return `'${obj.replace(/'/g, "\\'")}'`;

  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]';
    const items = obj.map((item) => innerSpaces + formatJsObject(item, indent + 1));
    return `[\n${items.join(',\n')}\n${spaces}]`;
  }

  if (typeof obj === 'object') {
    const entries = Object.entries(obj as Record<string, unknown>);
    if (entries.length === 0) return '{}';
    const items = entries.map(
      ([key, value]) => `${innerSpaces}${key}: ${formatJsObject(value, indent + 1)}`
    );
    return `{\n${items.join(',\n')}\n${spaces}}`;
  }

  return String(obj);
}
