import type { GeneratorInput, GeneratorOutput } from './types';
import { filterHeaders, getContentType, isJsonContentType } from './utils';

export function generatePowerShell({ entry, requestBody }: GeneratorInput): GeneratorOutput {
  const lines: string[] = [];

  const method = entry.method.toUpperCase();
  const filteredHeaders = filterHeaders(entry.requestHeaders);
  const contentType = getContentType(entry.requestHeaders);
  const isJson = isJsonContentType(contentType);
  const hasBody = requestBody && ['POST', 'PUT', 'PATCH'].includes(method);
  const hasHeaders = Object.keys(filteredHeaders).length > 0;

  // URL
  lines.push(`$uri = "${entry.url}"`);
  lines.push('');

  // Headers
  if (hasHeaders) {
    lines.push('$headers = @{');
    for (const [key, value] of Object.entries(filteredHeaders)) {
      // Escape double quotes in values
      const escapedValue = value.replace(/"/g, '`"');
      lines.push(`    "${key}" = "${escapedValue}"`);
    }
    lines.push('}');
    lines.push('');
  }

  // Body
  if (hasBody) {
    if (isJson) {
      try {
        const parsed = JSON.parse(requestBody);
        lines.push(`$body = '${JSON.stringify(parsed, null, 2).replace(/'/g, "''")}'`);
      } catch {
        lines.push(`$body = @'`);
        lines.push(requestBody);
        lines.push(`'@`);
      }
    } else {
      lines.push(`$body = @'`);
      lines.push(requestBody);
      lines.push(`'@`);
    }
    lines.push('');
  }

  // Build the Invoke-WebRequest call
  let command = '$response = Invoke-WebRequest -Uri $uri';
  command += ` -Method ${method}`;

  if (hasHeaders) {
    command += ' -Headers $headers';
  }

  if (hasBody) {
    command += ' -Body $body';
    if (isJson) {
      command += ' -ContentType "application/json"';
    }
  }

  lines.push(command);
  lines.push('');

  // Response handling
  lines.push('# Display response');
  lines.push('Write-Host "Status:" $response.StatusCode $response.StatusDescription');
  lines.push('$response.Content');

  return {
    code: lines.join('\n'),
    language: 'PowerShell',
    syntaxHighlight: 'powershell',
  };
}
