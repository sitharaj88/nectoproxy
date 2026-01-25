import { eq } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { getDatabase } from '../db/connection.js';
import { sessions } from '../db/schema.js';
import type { Session, SessionCreateInput, SessionUpdateInput } from '@proxyscope/shared';

export class SessionRepository {
  private get db() {
    return getDatabase();
  }

  async create(input: SessionCreateInput): Promise<Session> {
    const now = new Date();
    const session = {
      id: uuid(),
      name: input.name,
      isActive: true,
      isRecording: true,
      createdAt: now,
      updatedAt: now,
      trafficCount: 0,
      totalBytes: 0,
    };

    await this.db.insert(sessions).values(session);

    return this.mapToSession(session);
  }

  async findById(id: string): Promise<Session | null> {
    const result = await this.db.select().from(sessions).where(eq(sessions.id, id)).limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.mapToSession(result[0]);
  }

  async findAll(): Promise<Session[]> {
    const result = await this.db.select().from(sessions).orderBy(sessions.createdAt);
    return result.map((row) => this.mapToSession(row));
  }

  async findActive(): Promise<Session | null> {
    const result = await this.db
      .select()
      .from(sessions)
      .where(eq(sessions.isActive, true))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.mapToSession(result[0]);
  }

  async update(id: string, input: SessionUpdateInput): Promise<Session | null> {
    const existing = await this.findById(id);
    if (!existing) {
      return null;
    }

    const updates: Partial<typeof sessions.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (input.name !== undefined) {
      updates.name = input.name;
    }
    if (input.isActive !== undefined) {
      updates.isActive = input.isActive;
    }
    if (input.isRecording !== undefined) {
      updates.isRecording = input.isRecording;
    }

    await this.db.update(sessions).set(updates).where(eq(sessions.id, id));

    return this.findById(id);
  }

  async setActive(id: string): Promise<void> {
    // Deactivate all sessions
    await this.db.update(sessions).set({ isActive: false });

    // Activate the specified session
    await this.db.update(sessions).set({ isActive: true, updatedAt: new Date() }).where(eq(sessions.id, id));
  }

  async incrementTrafficCount(id: string, bytes: number): Promise<void> {
    const session = await this.findById(id);
    if (!session) return;

    await this.db
      .update(sessions)
      .set({
        trafficCount: session.trafficCount + 1,
        totalBytes: session.totalBytes + bytes,
        updatedAt: new Date(),
      })
      .where(eq(sessions.id, id));
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db.delete(sessions).where(eq(sessions.id, id));
    return result.changes > 0;
  }

  async deleteAll(): Promise<void> {
    await this.db.delete(sessions);
  }

  private mapToSession(row: typeof sessions.$inferSelect): Session {
    return {
      id: row.id,
      name: row.name,
      isActive: row.isActive,
      isRecording: row.isRecording,
      createdAt: row.createdAt.getTime(),
      updatedAt: row.updatedAt.getTime(),
      trafficCount: row.trafficCount,
      totalBytes: row.totalBytes,
    };
  }
}
