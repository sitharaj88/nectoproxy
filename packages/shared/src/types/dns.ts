export interface DnsMapping {
  id: string;
  domain: string; // e.g., "api.example.com" or "*.example.com"
  targetIp: string; // e.g., "127.0.0.1" or "192.168.1.100"
  enabled: boolean;
  description?: string;
  createdAt: number;
  updatedAt: number;
}

export interface DnsMappingCreateInput {
  domain: string;
  targetIp: string;
  enabled?: boolean;
  description?: string;
}

export interface DnsMappingUpdateInput {
  domain?: string;
  targetIp?: string;
  enabled?: boolean;
  description?: string;
}
