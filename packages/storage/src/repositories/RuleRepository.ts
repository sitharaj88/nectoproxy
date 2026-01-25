import { eq, asc } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { getDatabase } from '../db/connection.js';
import { rules } from '../db/schema.js';
import type { Rule, RuleCreateInput, RuleUpdateInput, RuleMatcher, RuleAction } from '@proxyscope/shared';

export class RuleRepository {
  private get db() {
    return getDatabase();
  }

  async create(input: RuleCreateInput): Promise<Rule> {
    const now = new Date();
    const rule = {
      id: uuid(),
      name: input.name,
      enabled: input.enabled ?? true,
      priority: input.priority ?? 0,
      match: input.match,
      action: input.action,
      config: input.config ?? null,
      createdAt: now,
      updatedAt: now,
    };

    await this.db.insert(rules).values(rule);

    return this.mapToRule({ ...rule, createdAt: now, updatedAt: now });
  }

  async findById(id: string): Promise<Rule | null> {
    const result = await this.db.select().from(rules).where(eq(rules.id, id)).limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.mapToRule(result[0]);
  }

  async findAll(): Promise<Rule[]> {
    const result = await this.db.select().from(rules).orderBy(asc(rules.priority), asc(rules.createdAt));
    return result.map((row) => this.mapToRule(row));
  }

  async findEnabled(): Promise<Rule[]> {
    const result = await this.db
      .select()
      .from(rules)
      .where(eq(rules.enabled, true))
      .orderBy(asc(rules.priority), asc(rules.createdAt));

    return result.map((row) => this.mapToRule(row));
  }

  async update(id: string, input: RuleUpdateInput): Promise<Rule | null> {
    const existing = await this.findById(id);
    if (!existing) {
      return null;
    }

    const updates: Partial<typeof rules.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (input.name !== undefined) {
      updates.name = input.name;
    }
    if (input.enabled !== undefined) {
      updates.enabled = input.enabled;
    }
    if (input.priority !== undefined) {
      updates.priority = input.priority;
    }
    if (input.match !== undefined) {
      updates.match = input.match;
    }
    if (input.action !== undefined) {
      updates.action = input.action;
    }
    if (input.config !== undefined) {
      updates.config = input.config;
    }

    await this.db.update(rules).set(updates).where(eq(rules.id, id));

    return this.findById(id);
  }

  async toggleEnabled(id: string): Promise<Rule | null> {
    const existing = await this.findById(id);
    if (!existing) {
      return null;
    }

    await this.db
      .update(rules)
      .set({
        enabled: !existing.enabled,
        updatedAt: new Date(),
      })
      .where(eq(rules.id, id));

    return this.findById(id);
  }

  async reorderPriorities(orderedIds: string[]): Promise<void> {
    const now = new Date();

    for (let i = 0; i < orderedIds.length; i++) {
      await this.db
        .update(rules)
        .set({
          priority: i,
          updatedAt: now,
        })
        .where(eq(rules.id, orderedIds[i]));
    }
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db.delete(rules).where(eq(rules.id, id));
    return result.changes > 0;
  }

  async deleteAll(): Promise<void> {
    await this.db.delete(rules);
  }

  private mapToRule(row: typeof rules.$inferSelect): Rule {
    return {
      id: row.id,
      name: row.name,
      enabled: row.enabled,
      priority: row.priority,
      match: row.match as RuleMatcher,
      action: row.action as RuleAction,
      config: row.config as Rule['config'],
      createdAt: row.createdAt.getTime(),
      updatedAt: row.updatedAt.getTime(),
    };
  }
}
