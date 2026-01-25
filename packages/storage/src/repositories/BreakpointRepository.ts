import { eq, asc } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { getDatabase } from '../db/connection.js';
import { breakpoints } from '../db/schema.js';
import type {
  Breakpoint,
  BreakpointCreateInput,
  BreakpointType,
  RuleMatcher,
} from '@proxyscope/shared';

export class BreakpointRepository {
  private get db() {
    return getDatabase();
  }

  async create(input: BreakpointCreateInput): Promise<Breakpoint> {
    const now = new Date();
    const breakpoint = {
      id: uuid(),
      name: input.name,
      enabled: input.enabled ?? true,
      type: input.type,
      match: input.match,
      createdAt: now,
    };

    await this.db.insert(breakpoints).values(breakpoint);

    return this.mapToBreakpoint({ ...breakpoint, createdAt: now });
  }

  async findById(id: string): Promise<Breakpoint | null> {
    const result = await this.db
      .select()
      .from(breakpoints)
      .where(eq(breakpoints.id, id))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.mapToBreakpoint(result[0]);
  }

  async findAll(): Promise<Breakpoint[]> {
    const result = await this.db
      .select()
      .from(breakpoints)
      .orderBy(asc(breakpoints.createdAt));
    return result.map((row) => this.mapToBreakpoint(row));
  }

  async findEnabled(): Promise<Breakpoint[]> {
    const result = await this.db
      .select()
      .from(breakpoints)
      .where(eq(breakpoints.enabled, true))
      .orderBy(asc(breakpoints.createdAt));

    return result.map((row) => this.mapToBreakpoint(row));
  }

  async update(
    id: string,
    input: Partial<BreakpointCreateInput>
  ): Promise<Breakpoint | null> {
    const existing = await this.findById(id);
    if (!existing) {
      return null;
    }

    const updates: Partial<typeof breakpoints.$inferInsert> = {};

    if (input.name !== undefined) {
      updates.name = input.name;
    }
    if (input.enabled !== undefined) {
      updates.enabled = input.enabled;
    }
    if (input.type !== undefined) {
      updates.type = input.type;
    }
    if (input.match !== undefined) {
      updates.match = input.match;
    }

    await this.db.update(breakpoints).set(updates).where(eq(breakpoints.id, id));

    return this.findById(id);
  }

  async toggleEnabled(id: string): Promise<Breakpoint | null> {
    const existing = await this.findById(id);
    if (!existing) {
      return null;
    }

    await this.db
      .update(breakpoints)
      .set({ enabled: !existing.enabled })
      .where(eq(breakpoints.id, id));

    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db.delete(breakpoints).where(eq(breakpoints.id, id));
    return result.changes > 0;
  }

  async deleteAll(): Promise<void> {
    await this.db.delete(breakpoints);
  }

  private mapToBreakpoint(row: typeof breakpoints.$inferSelect): Breakpoint {
    return {
      id: row.id,
      name: row.name,
      enabled: row.enabled,
      type: row.type as BreakpointType,
      match: row.match as RuleMatcher,
      createdAt: row.createdAt.getTime(),
    };
  }
}
