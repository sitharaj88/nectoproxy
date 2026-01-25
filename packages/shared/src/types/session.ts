export interface Session {
  id: string;
  name: string;
  isActive: boolean;
  isRecording: boolean;
  createdAt: number;
  updatedAt: number;
  trafficCount: number;
  totalBytes: number;
}

export interface SessionCreateInput {
  name: string;
}

export interface SessionUpdateInput {
  name?: string;
  isActive?: boolean;
  isRecording?: boolean;
}
