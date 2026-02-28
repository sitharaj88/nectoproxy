import { eq, asc } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { getDatabase } from '../db/connection.js';
import { sslPassthrough } from '../db/schema.js';
import type { SSLPassthroughDomain, SSLPassthroughCreateInput } from '@nectoproxy/shared';

export class SSLPassthroughRepository {
  private get db() {
    return getDatabase();
  }

  async create(input: SSLPassthroughCreateInput): Promise<SSLPassthroughDomain> {
    const now = new Date();
    const entry = {
      id: uuid(),
      domain: input.domain,
      enabled: input.enabled ?? true,
      reason: input.reason ?? null,
      createdAt: now,
    };

    await this.db.insert(sslPassthrough).values(entry);

    return this.mapToDomain(entry);
  }

  async findAll(): Promise<SSLPassthroughDomain[]> {
    const result = await this.db.select().from(sslPassthrough).orderBy(asc(sslPassthrough.createdAt));
    return result.map((row) => this.mapToDomain(row));
  }

  async findEnabled(): Promise<SSLPassthroughDomain[]> {
    const result = await this.db
      .select()
      .from(sslPassthrough)
      .where(eq(sslPassthrough.enabled, true))
      .orderBy(asc(sslPassthrough.createdAt));

    return result.map((row) => this.mapToDomain(row));
  }

  async toggleEnabled(id: string): Promise<SSLPassthroughDomain | null> {
    const result = await this.db.select().from(sslPassthrough).where(eq(sslPassthrough.id, id)).limit(1);

    if (result.length === 0) {
      return null;
    }

    const existing = result[0];
    await this.db
      .update(sslPassthrough)
      .set({ enabled: !existing.enabled })
      .where(eq(sslPassthrough.id, id));

    const updated = await this.db.select().from(sslPassthrough).where(eq(sslPassthrough.id, id)).limit(1);
    return updated.length > 0 ? this.mapToDomain(updated[0]) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db.delete(sslPassthrough).where(eq(sslPassthrough.id, id));
    return result.changes > 0;
  }

  async deleteAll(): Promise<void> {
    await this.db.delete(sslPassthrough);
  }

  private mapToDomain(row: typeof sslPassthrough.$inferSelect): SSLPassthroughDomain {
    return {
      id: row.id,
      domain: row.domain,
      enabled: row.enabled,
      reason: row.reason ?? undefined,
      createdAt: row.createdAt.getTime(),
    };
  }
}
