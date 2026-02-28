export interface SSLPassthroughDomain {
  id: string;
  domain: string; // e.g., "*.google.com" or "youtube.com"
  enabled: boolean;
  reason?: string; // Why this domain is being passed through
  createdAt: number;
}

export interface SSLPassthroughCreateInput {
  domain: string;
  enabled?: boolean;
  reason?: string;
}
