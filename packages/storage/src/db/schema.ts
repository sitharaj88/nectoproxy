import { sqliteTable, text, integer, blob } from 'drizzle-orm/sqlite-core';

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(false),
  isRecording: integer('is_recording', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  trafficCount: integer('traffic_count').notNull().default(0),
  totalBytes: integer('total_bytes').notNull().default(0),
});

export const traffic = sqliteTable('traffic', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull().references(() => sessions.id, { onDelete: 'cascade' }),
  timestamp: integer('timestamp', { mode: 'timestamp_ms' }).notNull(),

  // Request
  method: text('method').notNull(),
  url: text('url').notNull(),
  protocol: text('protocol').notNull(), // http, https, ws, wss
  host: text('host').notNull(),
  path: text('path').notNull(),
  requestHeaders: text('request_headers', { mode: 'json' }).$type<Record<string, string | string[]>>(),
  requestBody: blob('request_body', { mode: 'buffer' }),
  requestBodySize: integer('request_body_size').notNull().default(0),

  // Response
  status: integer('status'),
  statusText: text('status_text'),
  responseHeaders: text('response_headers', { mode: 'json' }).$type<Record<string, string | string[]>>(),
  responseBody: blob('response_body', { mode: 'buffer' }),
  responseBodySize: integer('response_body_size'),

  // Metadata
  duration: integer('duration'),
  remoteAddress: text('remote_address'),
  tlsVersion: text('tls_version'),
  error: text('error'),

  // Flags
  isComplete: integer('is_complete', { mode: 'boolean' }).notNull().default(false),
  isMocked: integer('is_mocked', { mode: 'boolean' }).notNull().default(false),
  isBreakpointed: integer('is_breakpointed', { mode: 'boolean' }).notNull().default(false),
  isTruncated: integer('is_truncated', { mode: 'boolean' }).notNull().default(false),
});

export const rules = sqliteTable('rules', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  priority: integer('priority').notNull().default(0),
  match: text('match', { mode: 'json' }).notNull(),
  action: text('action').notNull(),
  config: text('config', { mode: 'json' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export const breakpoints = sqliteTable('breakpoints', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  type: text('type').notNull(), // request, response, both
  match: text('match', { mode: 'json' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
});

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value', { mode: 'json' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export const wsFrames = sqliteTable('ws_frames', {
  id: text('id').primaryKey(),
  trafficId: text('traffic_id').notNull().references(() => traffic.id, { onDelete: 'cascade' }),
  timestamp: integer('timestamp', { mode: 'timestamp_ms' }).notNull(),
  direction: text('direction').notNull(), // 'client-to-server' | 'server-to-client'
  opcode: integer('opcode').notNull(), // 1 = text, 2 = binary, 8 = close, 9 = ping, 10 = pong
  data: blob('data', { mode: 'buffer' }),
  isBinary: integer('is_binary', { mode: 'boolean' }).notNull().default(false),
  length: integer('length').notNull().default(0),
});
