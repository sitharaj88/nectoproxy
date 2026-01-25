import type { GeneratorInput, GeneratorOutput } from './types';

export function generateGo({ entry, requestBody }: GeneratorInput): GeneratorOutput {
  const lines: string[] = [];

  const method = entry.method.toUpperCase();
  const hasBody = requestBody && ['POST', 'PUT', 'PATCH'].includes(method);

  // Package and imports
  lines.push('package main');
  lines.push('');
  lines.push('import (');
  lines.push('\t"fmt"');
  lines.push('\t"io"');
  lines.push('\t"net/http"');
  if (hasBody) {
    lines.push('\t"strings"');
  }
  lines.push(')');
  lines.push('');

  // Main function
  lines.push('func main() {');

  // URL
  lines.push(`\turl := "${entry.url}"`);
  lines.push('');

  // Create request
  if (hasBody) {
    const escapedBody = requestBody.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    lines.push(`\tbody := strings.NewReader("${escapedBody}")`);
    lines.push(`\treq, err := http.NewRequest("${method}", url, body)`);
  } else {
    lines.push(`\treq, err := http.NewRequest("${method}", url, nil)`);
  }

  lines.push('\tif err != nil {');
  lines.push('\t\tfmt.Println("Error creating request:", err)');
  lines.push('\t\treturn');
  lines.push('\t}');
  lines.push('');

  // Headers
  const headers = entry.requestHeaders || {};
  const skipHeaders = ['host', 'content-length', 'connection'];

  for (const [key, value] of Object.entries(headers)) {
    if (skipHeaders.includes(key.toLowerCase())) continue;
    const headerValue = Array.isArray(value) ? value.join(', ') : value;
    lines.push(`\treq.Header.Set("${key}", "${headerValue}")`);
  }

  if (Object.keys(headers).length > 0) {
    lines.push('');
  }

  // Make request
  lines.push('\tclient := &http.Client{}');
  lines.push('\tresp, err := client.Do(req)');
  lines.push('\tif err != nil {');
  lines.push('\t\tfmt.Println("Error making request:", err)');
  lines.push('\t\treturn');
  lines.push('\t}');
  lines.push('\tdefer resp.Body.Close()');
  lines.push('');

  // Read response
  lines.push('\trespBody, err := io.ReadAll(resp.Body)');
  lines.push('\tif err != nil {');
  lines.push('\t\tfmt.Println("Error reading response:", err)');
  lines.push('\t\treturn');
  lines.push('\t}');
  lines.push('');

  // Print response
  lines.push('\tfmt.Println("Status:", resp.Status)');
  lines.push('\tfmt.Println("Response:", string(respBody))');

  lines.push('}');

  return {
    code: lines.join('\n'),
    language: 'Go',
    syntaxHighlight: 'go',
  };
}
