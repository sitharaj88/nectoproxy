import type { GeneratorInput, GeneratorOutput } from './types';
import { filterHeaders, getContentType, isJsonContentType } from './utils';

export function generatePhp({ entry, requestBody }: GeneratorInput): GeneratorOutput {
  const lines: string[] = [];

  const method = entry.method.toUpperCase();
  const hasBody = requestBody && ['POST', 'PUT', 'PATCH'].includes(method);

  // PHP opening
  lines.push('<?php');
  lines.push('');

  // URL
  lines.push(`$url = '${entry.url}';`);
  lines.push('');

  // Headers
  const headerMap = filterHeaders(entry.requestHeaders);
  const filteredHeaders: string[] = [];

  for (const [key, value] of Object.entries(headerMap)) {
    filteredHeaders.push(`'${key}: ${value}'`);
  }

  if (filteredHeaders.length > 0) {
    lines.push('$headers = [');
    for (const header of filteredHeaders) {
      lines.push(`    ${header},`);
    }
    lines.push('];');
    lines.push('');
  }

  // Body
  if (hasBody) {
    const contentType = getContentType(entry.requestHeaders);
    if (isJsonContentType(contentType)) {
      try {
        const parsed = JSON.parse(requestBody);
        lines.push(`$data = json_encode(${formatPhpArray(parsed)});`);
      } catch {
        lines.push(`$data = '${requestBody.replace(/'/g, "\\'")}';`);
      }
    } else {
      lines.push(`$data = '${requestBody.replace(/'/g, "\\'")}';`);
    }
    lines.push('');
  }

  // cURL initialization
  lines.push('$ch = curl_init();');
  lines.push('');

  // cURL options
  lines.push('curl_setopt_array($ch, [');
  lines.push('    CURLOPT_URL => $url,');
  lines.push('    CURLOPT_RETURNTRANSFER => true,');
  lines.push('    CURLOPT_ENCODING => \'\',');
  lines.push('    CURLOPT_MAXREDIRS => 10,');
  lines.push('    CURLOPT_TIMEOUT => 30,');
  lines.push('    CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,');

  if (method !== 'GET') {
    lines.push(`    CURLOPT_CUSTOMREQUEST => '${method}',`);
  }

  if (hasBody) {
    lines.push('    CURLOPT_POSTFIELDS => $data,');
  }

  if (filteredHeaders.length > 0) {
    lines.push('    CURLOPT_HTTPHEADER => $headers,');
  }

  lines.push(']);');
  lines.push('');

  // Execute
  lines.push('$response = curl_exec($ch);');
  lines.push('$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);');
  lines.push('$error = curl_error($ch);');
  lines.push('');
  lines.push('curl_close($ch);');
  lines.push('');

  // Error handling
  lines.push('if ($error) {');
  lines.push('    echo "Error: " . $error;');
  lines.push('} else {');
  lines.push('    echo "Status: " . $httpCode . "\\n";');
  lines.push('    echo "Response: " . $response;');
  lines.push('}');

  return {
    code: lines.join('\n'),
    language: 'PHP',
    syntaxHighlight: 'php',
  };
}

function formatPhpArray(obj: unknown, indent = 0): string {
  const spaces = '    '.repeat(indent);
  const innerSpaces = '    '.repeat(indent + 1);

  if (obj === null) return 'null';
  if (typeof obj === 'boolean') return obj ? 'true' : 'false';
  if (typeof obj === 'number') return String(obj);
  if (typeof obj === 'string') return `'${obj.replace(/'/g, "\\'")}'`;

  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]';
    const items = obj.map((item) => innerSpaces + formatPhpArray(item, indent + 1));
    return `[\n${items.join(',\n')}\n${spaces}]`;
  }

  if (typeof obj === 'object') {
    const entries = Object.entries(obj as Record<string, unknown>);
    if (entries.length === 0) return '[]';
    const items = entries.map(
      ([key, value]) => `${innerSpaces}'${key}' => ${formatPhpArray(value, indent + 1)}`
    );
    return `[\n${items.join(',\n')}\n${spaces}]`;
  }

  return String(obj);
}
