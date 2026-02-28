export interface ParsedGRPCRequest {
  service: string;
  method: string;
  isStreaming: boolean;
}

export function isGRPCRequest(
  headers: Record<string, string | string[]> | null
): boolean {
  if (!headers) return false;
  const contentType = headers['content-type'] || '';
  const ct = typeof contentType === 'string' ? contentType : contentType[0] || '';
  return ct.includes('application/grpc') || ct.includes('application/grpc-web');
}

export function parseGRPCRequest(
  path: string,
  headers: Record<string, string | string[]> | null
): ParsedGRPCRequest | null {
  // gRPC paths are like /package.ServiceName/MethodName
  const match = path.match(/^\/([^/]+)\/([^/]+)$/);
  if (!match) return null;

  return {
    service: match[1],
    method: match[2],
    isStreaming: headers?.['grpc-encoding'] !== undefined || false,
  };
}

export function getGRPCStatusText(code: number): string {
  const statusMap: Record<number, string> = {
    0: 'OK',
    1: 'CANCELLED',
    2: 'UNKNOWN',
    3: 'INVALID_ARGUMENT',
    4: 'DEADLINE_EXCEEDED',
    5: 'NOT_FOUND',
    6: 'ALREADY_EXISTS',
    7: 'PERMISSION_DENIED',
    8: 'RESOURCE_EXHAUSTED',
    9: 'FAILED_PRECONDITION',
    10: 'ABORTED',
    11: 'OUT_OF_RANGE',
    12: 'UNIMPLEMENTED',
    13: 'INTERNAL',
    14: 'UNAVAILABLE',
    15: 'DATA_LOSS',
    16: 'UNAUTHENTICATED',
  };
  return statusMap[code] || `UNKNOWN (${code})`;
}
