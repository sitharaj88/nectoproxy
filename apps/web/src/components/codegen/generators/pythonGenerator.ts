import type { GeneratorInput, GeneratorOutput } from './types';
import { filterHeaders, getContentType, isJsonContentType } from './utils';

export function generatePython({ entry, requestBody }: GeneratorInput): GeneratorOutput {
  const lines: string[] = [];

  // Import
  lines.push('import requests');
  lines.push('');

  // URL
  lines.push(`url = "${entry.url}"`);
  lines.push('');

  // Headers
  const filteredHeaders = filterHeaders(entry.requestHeaders);

  if (Object.keys(filteredHeaders).length > 0) {
    lines.push('headers = {');
    for (const [key, value] of Object.entries(filteredHeaders)) {
      lines.push(`    "${key}": "${value}",`);
    }
    lines.push('}');
    lines.push('');
  }

  // Body
  const method = entry.method.toLowerCase();
  const hasBody = requestBody && ['post', 'put', 'patch'].includes(method);
  const contentType = getContentType(entry.requestHeaders);

  if (hasBody) {
    if (isJsonContentType(contentType)) {
      try {
        const parsed = JSON.parse(requestBody);
        lines.push('payload = ' + formatPythonDict(parsed));
        lines.push('');
      } catch {
        lines.push(`data = """${requestBody}"""`);
        lines.push('');
      }
    } else {
      lines.push(`data = """${requestBody}"""`);
      lines.push('');
    }
  }

  // Request call
  const hasHeaders = Object.keys(filteredHeaders).length > 0;
  const isJson = isJsonContentType(contentType);

  let callLine = `response = requests.${method}(url`;

  if (hasHeaders) {
    callLine += ', headers=headers';
  }

  if (hasBody) {
    if (isJson) {
      callLine += ', json=payload';
    } else {
      callLine += ', data=data';
    }
  }

  callLine += ')';
  lines.push(callLine);
  lines.push('');

  // Response handling
  lines.push('# Response');
  lines.push('print(f"Status: {response.status_code}")');
  lines.push('print(response.text)');

  return {
    code: lines.join('\n'),
    language: 'Python',
    syntaxHighlight: 'python',
  };
}

function formatPythonDict(obj: unknown, indent = 0): string {
  const spaces = '    '.repeat(indent);
  const innerSpaces = '    '.repeat(indent + 1);

  if (obj === null) return 'None';
  if (typeof obj === 'boolean') return obj ? 'True' : 'False';
  if (typeof obj === 'number') return String(obj);
  if (typeof obj === 'string') return `"${obj.replace(/"/g, '\\"')}"`;

  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]';
    const items = obj.map((item) => innerSpaces + formatPythonDict(item, indent + 1));
    return `[\n${items.join(',\n')}\n${spaces}]`;
  }

  if (typeof obj === 'object') {
    const entries = Object.entries(obj as Record<string, unknown>);
    if (entries.length === 0) return '{}';
    const items = entries.map(
      ([key, value]) => `${innerSpaces}"${key}": ${formatPythonDict(value, indent + 1)}`
    );
    return `{\n${items.join(',\n')}\n${spaces}}`;
  }

  return String(obj);
}
