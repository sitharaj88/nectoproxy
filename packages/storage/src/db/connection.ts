import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import * as schema from './schema.js';

export interface DatabaseConfig {
  dataDir: string;
  filename: string;
}

const DEFAULT_CONFIG: DatabaseConfig = {
  dataDir: path.join(os.homedir(), '.proxyscope'),
  filename: 'data.db',
};

let dbInstance: ReturnType<typeof drizzle> | null = null;
let sqliteInstance: Database.Database | null = null;

export function getDatabase(config: Partial<DatabaseConfig> = {}): ReturnType<typeof drizzle> {
  if (dbInstance) {
    return dbInstance;
  }

  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  // Ensure data directory exists
  fs.mkdirSync(finalConfig.dataDir, { recursive: true });

  const dbPath = path.join(finalConfig.dataDir, finalConfig.filename);
  sqliteInstance = new Database(dbPath);

  // Enable WAL mode for better concurrent access
  sqliteInstance.pragma('journal_mode = WAL');
  sqliteInstance.pragma('synchronous = NORMAL');
  sqliteInstance.pragma('foreign_keys = ON');

  dbInstance = drizzle(sqliteInstance, { schema });

  // Run migrations/create tables
  initializeDatabase(sqliteInstance);

  return dbInstance;
}

function initializeDatabase(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 0,
      is_recording INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      traffic_count INTEGER NOT NULL DEFAULT 0,
      total_bytes INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS traffic (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      timestamp INTEGER NOT NULL,
      method TEXT NOT NULL,
      url TEXT NOT NULL,
      protocol TEXT NOT NULL,
      host TEXT NOT NULL,
      path TEXT NOT NULL,
      request_headers TEXT,
      request_body BLOB,
      request_body_size INTEGER NOT NULL DEFAULT 0,
      status INTEGER,
      status_text TEXT,
      response_headers TEXT,
      response_body BLOB,
      response_body_size INTEGER,
      duration INTEGER,
      remote_address TEXT,
      tls_version TEXT,
      error TEXT,
      is_complete INTEGER NOT NULL DEFAULT 0,
      is_mocked INTEGER NOT NULL DEFAULT 0,
      is_breakpointed INTEGER NOT NULL DEFAULT 0,
      is_truncated INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_traffic_session ON traffic(session_id);
    CREATE INDEX IF NOT EXISTS idx_traffic_timestamp ON traffic(timestamp);
    CREATE INDEX IF NOT EXISTS idx_traffic_host ON traffic(host);
    CREATE INDEX IF NOT EXISTS idx_traffic_method ON traffic(method);
    CREATE INDEX IF NOT EXISTS idx_traffic_status ON traffic(status);

    CREATE TABLE IF NOT EXISTS rules (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      priority INTEGER NOT NULL DEFAULT 0,
      match TEXT NOT NULL,
      action TEXT NOT NULL,
      config TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS breakpoints (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      type TEXT NOT NULL,
      match TEXT NOT NULL,
      conditions TEXT,
      condition_logic TEXT DEFAULT 'and',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ssl_passthrough (
      id TEXT PRIMARY KEY,
      domain TEXT NOT NULL UNIQUE,
      enabled INTEGER NOT NULL DEFAULT 1,
      reason TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS dns_mappings (
      id TEXT PRIMARY KEY,
      domain TEXT NOT NULL UNIQUE,
      target_ip TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      description TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS annotations (
      id TEXT PRIMARY KEY,
      traffic_id TEXT NOT NULL REFERENCES traffic(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT 'gray',
      tags TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_annotations_traffic ON annotations(traffic_id);

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ws_frames (
      id TEXT PRIMARY KEY,
      traffic_id TEXT NOT NULL REFERENCES traffic(id) ON DELETE CASCADE,
      timestamp INTEGER NOT NULL,
      direction TEXT NOT NULL,
      opcode INTEGER NOT NULL,
      data BLOB,
      is_binary INTEGER NOT NULL DEFAULT 0,
      length INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_ws_frames_traffic ON ws_frames(traffic_id);
  `);

  // Migrate existing breakpoints table to add new columns if missing
  const bpColumns = db.prepare("PRAGMA table_info(breakpoints)").all() as { name: string }[];
  const bpColNames = new Set(bpColumns.map((c) => c.name));
  if (!bpColNames.has('conditions')) {
    db.exec("ALTER TABLE breakpoints ADD COLUMN conditions TEXT");
  }
  if (!bpColNames.has('condition_logic')) {
    db.exec("ALTER TABLE breakpoints ADD COLUMN condition_logic TEXT DEFAULT 'and'");
  }
}

export function closeDatabase(): void {
  if (sqliteInstance) {
    sqliteInstance.close();
    sqliteInstance = null;
    dbInstance = null;
  }
}

export function getDatabasePath(config: Partial<DatabaseConfig> = {}): string {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  return path.join(finalConfig.dataDir, finalConfig.filename);
}
