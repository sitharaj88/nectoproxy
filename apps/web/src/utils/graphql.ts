export interface ParsedGraphQLRequest {
  operationType: 'query' | 'mutation' | 'subscription';
  operationName: string | null;
  query: string;
  variables: Record<string, unknown> | null;
}

export function isGraphQLRequest(
  url: string,
  headers: Record<string, string | string[]> | null,
  body: string | null
): boolean {
  // Check if URL contains /graphql
  if (url.includes('/graphql')) return true;

  // Check content-type header
  if (headers) {
    const contentType = headers['content-type'] || '';
    const ct = typeof contentType === 'string' ? contentType : contentType[0] || '';
    if (ct.includes('application/graphql')) return true;
  }

  // Check if body looks like a GraphQL query (has "query" field)
  if (!body) return false;
  try {
    const parsed = JSON.parse(body);
    return 'query' in parsed && typeof parsed.query === 'string';
  } catch {
    return false;
  }
}

export function parseGraphQLRequest(body: string): ParsedGraphQLRequest | null {
  try {
    const parsed = JSON.parse(body);
    if (!parsed.query) return null;

    const query = parsed.query as string;

    // Extract operation type and name from query string
    const match = query.match(/^\s*(query|mutation|subscription)\s+(\w+)?/);

    return {
      operationType: (match?.[1] as 'query' | 'mutation' | 'subscription') || 'query',
      operationName: parsed.operationName || match?.[2] || null,
      query: query,
      variables: parsed.variables || null,
    };
  } catch {
    return null;
  }
}

export function formatGraphQLQuery(query: string): string {
  // Simple GraphQL query formatter/indenter
  let indent = 0;
  let result = '';
  let inString = false;

  for (let i = 0; i < query.length; i++) {
    const char = query[i];

    if (char === '"' && query[i - 1] !== '\\') {
      inString = !inString;
      result += char;
      continue;
    }

    if (inString) {
      result += char;
      continue;
    }

    if (char === '{') {
      indent++;
      result += ' {\n' + '  '.repeat(indent);
    } else if (char === '}') {
      indent--;
      result += '\n' + '  '.repeat(indent) + '}';
    } else if (char === ',') {
      result += '\n' + '  '.repeat(indent);
    } else if (char === '\n' || char === '\r') {
      // Skip existing newlines (we add our own)
    } else {
      result += char;
    }
  }

  return result.trim();
}
