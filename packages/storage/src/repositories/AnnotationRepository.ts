import { eq, asc, like } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { getDatabase } from '../db/connection.js';
import { annotations } from '../db/schema.js';
import type { Annotation, AnnotationCreateInput, AnnotationUpdateInput } from '@proxyscope/shared';

export class AnnotationRepository {
  private get db() {
    return getDatabase();
  }

  async create(input: AnnotationCreateInput): Promise<Annotation> {
    const now = new Date();
    const annotation = {
      id: uuid(),
      trafficId: input.trafficId,
      content: input.content,
      color: input.color ?? 'gray',
      tags: input.tags ?? [],
      createdAt: now,
      updatedAt: now,
    };

    await this.db.insert(annotations).values(annotation);

    return this.mapToAnnotation({ ...annotation, createdAt: now, updatedAt: now });
  }

  async findByTrafficId(trafficId: string): Promise<Annotation[]> {
    const result = await this.db
      .select()
      .from(annotations)
      .where(eq(annotations.trafficId, trafficId))
      .orderBy(asc(annotations.createdAt));

    return result.map((row) => this.mapToAnnotation(row));
  }

  async findAll(): Promise<Annotation[]> {
    const result = await this.db.select().from(annotations).orderBy(asc(annotations.createdAt));
    return result.map((row) => this.mapToAnnotation(row));
  }

  async update(id: string, input: AnnotationUpdateInput): Promise<Annotation | null> {
    const existing = await this.db
      .select()
      .from(annotations)
      .where(eq(annotations.id, id))
      .limit(1);

    if (existing.length === 0) {
      return null;
    }

    const updates: Partial<typeof annotations.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (input.content !== undefined) {
      updates.content = input.content;
    }
    if (input.color !== undefined) {
      updates.color = input.color;
    }
    if (input.tags !== undefined) {
      updates.tags = input.tags;
    }

    await this.db.update(annotations).set(updates).where(eq(annotations.id, id));

    const updated = await this.db
      .select()
      .from(annotations)
      .where(eq(annotations.id, id))
      .limit(1);

    if (updated.length === 0) {
      return null;
    }

    return this.mapToAnnotation(updated[0]);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db.delete(annotations).where(eq(annotations.id, id));
    return result.changes > 0;
  }

  async searchByTag(tag: string): Promise<Annotation[]> {
    // SQLite JSON: search for tag in the JSON array stored as text
    const result = await this.db
      .select()
      .from(annotations)
      .where(like(annotations.tags, `%"${tag}"%`))
      .orderBy(asc(annotations.createdAt));

    return result.map((row) => this.mapToAnnotation(row));
  }

  async getAnnotatedTrafficIds(): Promise<string[]> {
    const result = await this.db
      .select({ trafficId: annotations.trafficId })
      .from(annotations);

    // Return unique traffic IDs
    return [...new Set(result.map((row) => row.trafficId))];
  }

  private mapToAnnotation(row: typeof annotations.$inferSelect): Annotation {
    return {
      id: row.id,
      trafficId: row.trafficId,
      content: row.content,
      color: row.color as Annotation['color'],
      tags: row.tags as string[],
      createdAt: row.createdAt.getTime(),
      updatedAt: row.updatedAt.getTime(),
    };
  }
}
