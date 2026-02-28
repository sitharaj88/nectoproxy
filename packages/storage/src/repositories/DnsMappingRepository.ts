import { eq, asc } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { getDatabase } from '../db/connection.js';
import { dnsMappings } from '../db/schema.js';
import type { DnsMapping, DnsMappingCreateInput, DnsMappingUpdateInput } from '@nectoproxy/shared';

export class DnsMappingRepository {
  private get db() {
    return getDatabase();
  }

  async create(input: DnsMappingCreateInput): Promise<DnsMapping> {
    const now = new Date();
    const entry = {
      id: uuid(),
      domain: input.domain,
      targetIp: input.targetIp,
      enabled: input.enabled ?? true,
      description: input.description ?? null,
      createdAt: now,
      updatedAt: now,
    };

    await this.db.insert(dnsMappings).values(entry);

    return this.mapToDnsMapping(entry);
  }

  async findAll(): Promise<DnsMapping[]> {
    const result = await this.db.select().from(dnsMappings).orderBy(asc(dnsMappings.createdAt));
    return result.map((row) => this.mapToDnsMapping(row));
  }

  async findEnabled(): Promise<DnsMapping[]> {
    const result = await this.db
      .select()
      .from(dnsMappings)
      .where(eq(dnsMappings.enabled, true))
      .orderBy(asc(dnsMappings.createdAt));

    return result.map((row) => this.mapToDnsMapping(row));
  }

  async findById(id: string): Promise<DnsMapping | null> {
    const result = await this.db.select().from(dnsMappings).where(eq(dnsMappings.id, id)).limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.mapToDnsMapping(result[0]);
  }

  async update(id: string, input: DnsMappingUpdateInput): Promise<DnsMapping | null> {
    const existing = await this.findById(id);
    if (!existing) {
      return null;
    }

    const updates: Partial<typeof dnsMappings.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (input.domain !== undefined) {
      updates.domain = input.domain;
    }
    if (input.targetIp !== undefined) {
      updates.targetIp = input.targetIp;
    }
    if (input.enabled !== undefined) {
      updates.enabled = input.enabled;
    }
    if (input.description !== undefined) {
      updates.description = input.description;
    }

    await this.db.update(dnsMappings).set(updates).where(eq(dnsMappings.id, id));

    return this.findById(id);
  }

  async toggleEnabled(id: string): Promise<DnsMapping | null> {
    const result = await this.db.select().from(dnsMappings).where(eq(dnsMappings.id, id)).limit(1);

    if (result.length === 0) {
      return null;
    }

    const existing = result[0];
    await this.db
      .update(dnsMappings)
      .set({ enabled: !existing.enabled, updatedAt: new Date() })
      .where(eq(dnsMappings.id, id));

    const updated = await this.db.select().from(dnsMappings).where(eq(dnsMappings.id, id)).limit(1);
    return updated.length > 0 ? this.mapToDnsMapping(updated[0]) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db.delete(dnsMappings).where(eq(dnsMappings.id, id));
    return result.changes > 0;
  }

  async deleteAll(): Promise<void> {
    await this.db.delete(dnsMappings);
  }

  async resolve(hostname: string): Promise<string | null> {
    const enabled = await this.findEnabled();

    // Check exact match first
    for (const mapping of enabled) {
      if (mapping.domain === hostname) {
        return mapping.targetIp;
      }
    }

    // Check wildcard matches
    for (const mapping of enabled) {
      if (mapping.domain.startsWith('*.')) {
        const suffix = mapping.domain.slice(2);
        if (hostname === suffix || hostname.endsWith('.' + suffix)) {
          return mapping.targetIp;
        }
      }
    }

    return null;
  }

  private mapToDnsMapping(row: typeof dnsMappings.$inferSelect): DnsMapping {
    return {
      id: row.id,
      domain: row.domain,
      targetIp: row.targetIp,
      enabled: row.enabled,
      description: row.description ?? undefined,
      createdAt: row.createdAt.getTime(),
      updatedAt: row.updatedAt.getTime(),
    };
  }
}
