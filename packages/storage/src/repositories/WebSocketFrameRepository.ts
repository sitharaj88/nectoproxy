import { eq, desc } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { getDatabase } from '../db/connection.js';
import { wsFrames } from '../db/schema.js';
import type { WebSocketFrame } from '@proxyscope/shared';

export interface WebSocketFrameCreateInput {
  trafficId: string;
  direction: 'client-to-server' | 'server-to-client';
  opcode: number;
  data: Buffer | null;
  isBinary: boolean;
  length: number;
}

export class WebSocketFrameRepository {
  private db = getDatabase();

  async create(input: WebSocketFrameCreateInput): Promise<WebSocketFrame> {
    const id = uuid();
    const now = new Date();

    await this.db.insert(wsFrames).values({
      id,
      trafficId: input.trafficId,
      timestamp: now,
      direction: input.direction,
      opcode: input.opcode,
      data: input.data,
      isBinary: input.isBinary,
      length: input.length,
    });

    return {
      id,
      trafficId: input.trafficId,
      timestamp: now.getTime(),
      direction: input.direction,
      opcode: input.opcode,
      data: input.data,
      isBinary: input.isBinary,
      length: input.length,
    };
  }

  async findByTrafficId(trafficId: string, limit = 100): Promise<WebSocketFrame[]> {
    const rows = await this.db
      .select()
      .from(wsFrames)
      .where(eq(wsFrames.trafficId, trafficId))
      .orderBy(desc(wsFrames.timestamp))
      .limit(limit);

    return rows.map((row) => ({
      id: row.id,
      trafficId: row.trafficId,
      timestamp: row.timestamp.getTime(),
      direction: row.direction as 'client-to-server' | 'server-to-client',
      opcode: row.opcode,
      data: row.data,
      isBinary: row.isBinary,
      length: row.length,
    }));
  }

  async findById(id: string): Promise<WebSocketFrame | null> {
    const row = await this.db
      .select()
      .from(wsFrames)
      .where(eq(wsFrames.id, id))
      .get();

    if (!row) return null;

    return {
      id: row.id,
      trafficId: row.trafficId,
      timestamp: row.timestamp.getTime(),
      direction: row.direction as 'client-to-server' | 'server-to-client',
      opcode: row.opcode,
      data: row.data,
      isBinary: row.isBinary,
      length: row.length,
    };
  }

  async deleteByTrafficId(trafficId: string): Promise<void> {
    await this.db.delete(wsFrames).where(eq(wsFrames.trafficId, trafficId));
  }

  async countByTrafficId(trafficId: string): Promise<number> {
    const result = await this.db
      .select()
      .from(wsFrames)
      .where(eq(wsFrames.trafficId, trafficId));

    return result.length;
  }
}
