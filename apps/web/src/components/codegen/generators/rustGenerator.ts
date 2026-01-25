import type { GeneratorInput, GeneratorOutput } from './types';

export function generateRust({ entry, requestBody }: GeneratorInput): GeneratorOutput {
  const lines: string[] = [];

  const method = entry.method.toLowerCase();
  const hasBody = requestBody && ['post', 'put', 'patch'].includes(method);
  const contentType =
    entry.requestHeaders?.['content-type'] || entry.requestHeaders?.['Content-Type'] || '';
  const isJson = contentType.includes('application/json');

  // Cargo.toml comment
  lines.push('// Add to Cargo.toml:');
  lines.push('// [dependencies]');
  lines.push('// reqwest = { version = "0.11", features = ["json", "blocking"] }');
  lines.push('// tokio = { version = "1", features = ["full"] }');
  lines.push('// serde_json = "1.0"');
  lines.push('');

  // Use statements
  lines.push('use reqwest::header::{HeaderMap, HeaderValue};');
  lines.push('use std::error::Error;');
  lines.push('');

  // Main function
  lines.push('#[tokio::main]');
  lines.push('async fn main() -> Result<(), Box<dyn Error>> {');

  // URL
  lines.push(`    let url = "${entry.url}";`);
  lines.push('');

  // Client
  lines.push('    let client = reqwest::Client::new();');
  lines.push('');

  // Headers
  const headers = entry.requestHeaders || {};
  const skipHeaders = ['host', 'content-length', 'connection'];
  const filteredHeaders = Object.entries(headers).filter(
    ([key]) => !skipHeaders.includes(key.toLowerCase())
  );

  if (filteredHeaders.length > 0) {
    lines.push('    let mut headers = HeaderMap::new();');
    for (const [key, value] of filteredHeaders) {
      const headerValue = Array.isArray(value) ? value.join(', ') : value;
      lines.push(`    headers.insert("${key}", HeaderValue::from_static("${headerValue}"));`);
    }
    lines.push('');
  }

  // Build request
  lines.push(`    let response = client.${method}(url)`);

  if (filteredHeaders.length > 0) {
    lines.push('        .headers(headers)');
  }

  if (hasBody) {
    if (isJson) {
      try {
        const parsed = JSON.parse(requestBody);
        lines.push(`        .json(&serde_json::json!(${formatRustJson(parsed)}))`);
      } catch {
        const escapedBody = requestBody.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        lines.push(`        .body("${escapedBody}")`);
      }
    } else {
      const escapedBody = requestBody.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      lines.push(`        .body("${escapedBody}")`);
    }
  }

  lines.push('        .send()');
  lines.push('        .await?;');
  lines.push('');

  // Response
  lines.push('    println!("Status: {}", response.status());');
  lines.push('    let body = response.text().await?;');
  lines.push('    println!("Response: {}", body);');
  lines.push('');
  lines.push('    Ok(())');
  lines.push('}');

  return {
    code: lines.join('\n'),
    language: 'Rust',
    syntaxHighlight: 'rust',
  };
}

function formatRustJson(obj: unknown): string {
  if (obj === null) return 'null';
  if (typeof obj === 'boolean') return String(obj);
  if (typeof obj === 'number') return String(obj);
  if (typeof obj === 'string') return `"${obj.replace(/"/g, '\\"')}"`;

  if (Array.isArray(obj)) {
    const items = obj.map((item) => formatRustJson(item));
    return `[${items.join(', ')}]`;
  }

  if (typeof obj === 'object') {
    const entries = Object.entries(obj as Record<string, unknown>);
    const items = entries.map(([key, value]) => `"${key}": ${formatRustJson(value)}`);
    return `{${items.join(', ')}}`;
  }

  return String(obj);
}
