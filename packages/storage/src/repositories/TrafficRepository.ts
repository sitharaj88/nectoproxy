import { eq, and, like, gte, lte, inArray, desc, asc, sql, or, count as drizzleCount } from 'drizzle-orm';
import { getDatabase } from '../db/connection.js';
import { traffic, sessions } from '../db/schema.js';
import type { TrafficEntry, TrafficQuery, TrafficStats } from '@nectoproxy/shared';

export class TrafficRepository {
  private get db() {
    return getDatabase();
  }

  async create(entry: TrafficEntry): Promise<void> {
    await this.db.insert(traffic).values({
      id: entry.id,
      sessionId: entry.sessionId,
      timestamp: new Date(entry.timestamp),
      method: entry.method,
      url: entry.url,
      protocol: entry.protocol,
      host: entry.host,
      path: entry.path,
      requestHeaders: entry.requestHeaders,
      requestBody: entry.requestBody,
      requestBodySize: entry.requestBodySize,
      status: entry.status,
      statusText: entry.statusText,
      responseHeaders: entry.responseHeaders,
      responseBody: entry.responseBody,
      responseBodySize: entry.responseBodySize,
      duration: entry.duration,
      remoteAddress: entry.remoteAddress,
      tlsVersion: entry.tlsVersion,
      error: entry.error,
      isComplete: entry.isComplete,
      isMocked: entry.isMocked,
      isBreakpointed: entry.isBreakpointed,
      isTruncated: entry.isTruncated,
    });
  }

  async update(id: string, updates: Partial<TrafficEntry>): Promise<void> {
    const updateData: Partial<typeof traffic.$inferInsert> = {};

    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.statusText !== undefined) updateData.statusText = updates.statusText;
    if (updates.responseHeaders !== undefined) updateData.responseHeaders = updates.responseHeaders;
    if (updates.responseBody !== undefined) updateData.responseBody = updates.responseBody;
    if (updates.responseBodySize !== undefined) updateData.responseBodySize = updates.responseBodySize;
    if (updates.duration !== undefined) updateData.duration = updates.duration;
    if (updates.error !== undefined) updateData.error = updates.error;
    if (updates.isComplete !== undefined) updateData.isComplete = updates.isComplete;
    if (updates.isMocked !== undefined) updateData.isMocked = updates.isMocked;
    if (updates.isBreakpointed !== undefined) updateData.isBreakpointed = updates.isBreakpointed;

    await this.db.update(traffic).set(updateData).where(eq(traffic.id, id));
  }

  async findById(id: string): Promise<TrafficEntry | null> {
    const result = await this.db.select().from(traffic).where(eq(traffic.id, id)).limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.mapToTrafficEntry(result[0]);
  }

  async findBySession(sessionId: string, limit = 1000, offset = 0): Promise<TrafficEntry[]> {
    const result = await this.db
      .select()
      .from(traffic)
      .where(eq(traffic.sessionId, sessionId))
      .orderBy(desc(traffic.timestamp))
      .limit(limit)
      .offset(offset);

    return result.map((row) => this.mapToTrafficEntry(row));
  }

  async query(query: TrafficQuery): Promise<TrafficEntry[]> {
    const conditions = [];

    if (query.sessionId) {
      conditions.push(eq(traffic.sessionId, query.sessionId));
    }

    if (query.filter) {
      const { filter } = query;

      if (filter.search) {
        conditions.push(like(traffic.url, `%${filter.search}%`));
      }

      if (filter.methods && filter.methods.length > 0) {
        conditions.push(inArray(traffic.method, filter.methods));
      }

      if (filter.statusCodes && filter.statusCodes.length > 0) {
        conditions.push(inArray(traffic.status, filter.statusCodes));
      }

      if (filter.protocols && filter.protocols.length > 0) {
        conditions.push(inArray(traffic.protocol, filter.protocols));
      }

      if (filter.hosts && filter.hosts.length > 0) {
        conditions.push(inArray(traffic.host, filter.hosts));
      }

      if (filter.startTime) {
        conditions.push(gte(traffic.timestamp, new Date(filter.startTime)));
      }

      if (filter.endTime) {
        conditions.push(lte(traffic.timestamp, new Date(filter.endTime)));
      }

      if (filter.hasError) {
        conditions.push(sql`${traffic.error} IS NOT NULL`);
      }
    }

    let queryBuilder = this.db.select().from(traffic);

    if (conditions.length > 0) {
      queryBuilder = queryBuilder.where(and(...conditions)) as typeof queryBuilder;
    }

    // Apply sorting
    const sortField = query.sort?.field || 'timestamp';
    const sortDirection = query.sort?.direction || 'desc';

    const sortColumn = {
      timestamp: traffic.timestamp,
      duration: traffic.duration,
      size: traffic.responseBodySize,
      status: traffic.status,
      host: traffic.host,
      method: traffic.method,
    }[sortField] || traffic.timestamp;

    queryBuilder = queryBuilder.orderBy(
      sortDirection === 'desc' ? desc(sortColumn) : asc(sortColumn)
    ) as typeof queryBuilder;

    // Apply pagination
    if (query.limit) {
      queryBuilder = queryBuilder.limit(query.limit) as typeof queryBuilder;
    }
    if (query.offset) {
      queryBuilder = queryBuilder.offset(query.offset) as typeof queryBuilder;
    }

    const result = await queryBuilder;
    return result.map((row) => this.mapToTrafficEntry(row));
  }

  async getStats(sessionId: string): Promise<TrafficStats> {
    const result = await this.db
      .select({
        totalRequests: sql<number>`COUNT(*)`,
        completedRequests: sql<number>`SUM(CASE WHEN ${traffic.isComplete} = 1 THEN 1 ELSE 0 END)`,
        failedRequests: sql<number>`SUM(CASE WHEN ${traffic.error} IS NOT NULL THEN 1 ELSE 0 END)`,
        totalBytes: sql<number>`COALESCE(SUM(${traffic.requestBodySize}) + SUM(COALESCE(${traffic.responseBodySize}, 0)), 0)`,
        avgDuration: sql<number>`COALESCE(AVG(${traffic.duration}), 0)`,
      })
      .from(traffic)
      .where(eq(traffic.sessionId, sessionId));

    return {
      totalRequests: result[0]?.totalRequests || 0,
      completedRequests: result[0]?.completedRequests || 0,
      failedRequests: result[0]?.failedRequests || 0,
      totalBytes: result[0]?.totalBytes || 0,
      avgDuration: result[0]?.avgDuration || 0,
    };
  }

  async deleteBySession(sessionId: string): Promise<void> {
    await this.db.delete(traffic).where(eq(traffic.sessionId, sessionId));
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db.delete(traffic).where(eq(traffic.id, id));
    return result.changes > 0;
  }

  async searchGlobal(params: {
    query: string;
    searchIn?: ('url' | 'headers' | 'body')[];
    methods?: string[];
    statusCodes?: string[];
    limit?: number;
    offset?: number;
  }): Promise<{ entries: TrafficEntry[]; total: number; sessionNames: Record<string, string> }> {
    const { query, searchIn = ['url'], methods, statusCodes, limit = 50, offset = 0 } = params;

    const searchPattern = `%${query}%`;

    // Build search conditions based on searchIn
    const searchConditions = [];

    // Always search in url and host
    searchConditions.push(like(traffic.url, searchPattern));
    searchConditions.push(like(traffic.host, searchPattern));
    searchConditions.push(like(traffic.path, searchPattern));

    // Search in headers if requested
    if (searchIn.includes('headers')) {
      searchConditions.push(sql`CAST(${traffic.requestHeaders} AS TEXT) LIKE ${searchPattern}`);
      searchConditions.push(sql`CAST(${traffic.responseHeaders} AS TEXT) LIKE ${searchPattern}`);
    }

    // Search in body if requested
    if (searchIn.includes('body')) {
      searchConditions.push(sql`CAST(${traffic.requestBody} AS TEXT) LIKE ${searchPattern}`);
      searchConditions.push(sql`CAST(${traffic.responseBody} AS TEXT) LIKE ${searchPattern}`);
    }

    // Combine search conditions with OR (match any field)
    const searchOr = or(...searchConditions);

    // Build additional filter conditions
    const filterConditions = [];
    if (searchOr) {
      filterConditions.push(searchOr);
    }

    if (methods && methods.length > 0) {
      filterConditions.push(inArray(traffic.method, methods));
    }

    if (statusCodes && statusCodes.length > 0) {
      const statusInts = statusCodes.map((s) => parseInt(s, 10));
      filterConditions.push(inArray(traffic.status, statusInts));
    }

    const whereClause = filterConditions.length > 0 ? and(...filterConditions) : undefined;

    // Get total count
    const countResult = await this.db
      .select({ total: drizzleCount() })
      .from(traffic)
      .where(whereClause);

    const total = countResult[0]?.total || 0;

    // Get paginated results
    let queryBuilder = this.db.select().from(traffic);

    if (whereClause) {
      queryBuilder = queryBuilder.where(whereClause) as typeof queryBuilder;
    }

    queryBuilder = queryBuilder
      .orderBy(desc(traffic.timestamp))
      .limit(limit)
      .offset(offset) as typeof queryBuilder;

    const result = await queryBuilder;

    // Collect unique session IDs and fetch session names
    const sessionIds = [...new Set(result.map((row) => row.sessionId))];
    const sessionNames: Record<string, string> = {};

    if (sessionIds.length > 0) {
      const sessionResults = await this.db
        .select({ id: sessions.id, name: sessions.name })
        .from(sessions)
        .where(inArray(sessions.id, sessionIds));

      for (const s of sessionResults) {
        sessionNames[s.id] = s.name;
      }
    }

    return {
      entries: result.map((row) => this.mapToTrafficEntry(row)),
      total,
      sessionNames,
    };
  }

  private mapToTrafficEntry(row: typeof traffic.$inferSelect): TrafficEntry {
    return {
      id: row.id,
      sessionId: row.sessionId,
      timestamp: row.timestamp.getTime(),
      method: row.method,
      url: row.url,
      protocol: row.protocol as 'http' | 'https' | 'ws' | 'wss',
      host: row.host,
      path: row.path,
      requestHeaders: row.requestHeaders || {},
      requestBody: row.requestBody,
      requestBodySize: row.requestBodySize,
      status: row.status,
      statusText: row.statusText,
      responseHeaders: row.responseHeaders,
      responseBody: row.responseBody,
      responseBodySize: row.responseBodySize,
      duration: row.duration,
      remoteAddress: row.remoteAddress,
      tlsVersion: row.tlsVersion,
      error: row.error,
      isComplete: row.isComplete,
      isMocked: row.isMocked,
      isBreakpointed: row.isBreakpointed,
      isTruncated: row.isTruncated,
    };
  }
}
