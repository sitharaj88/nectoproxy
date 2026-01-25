import { eq } from 'drizzle-orm';
import { getDatabase } from '../db/connection.js';
import { settings } from '../db/schema.js';

export interface AppSettings {
  proxyPort: number;
  uiPort: number;
  recording: boolean;
  autoOpenBrowser: boolean;
  theme: 'light' | 'dark' | 'system';
  maxBodySize: number;
  requestTimeout: number;
  breakpointTimeout: number;
}

const DEFAULT_SETTINGS: AppSettings = {
  proxyPort: 8888,
  uiPort: 8889,
  recording: true,
  autoOpenBrowser: true,
  theme: 'dark',
  maxBodySize: 10 * 1024 * 1024, // 10MB
  requestTimeout: 30000, // 30 seconds
  breakpointTimeout: 30000, // 30 seconds
};

export class SettingsRepository {
  private db = getDatabase();

  async get<K extends keyof AppSettings>(key: K): Promise<AppSettings[K]> {
    const result = await this.db
      .select()
      .from(settings)
      .where(eq(settings.key, key))
      .get();

    if (!result) {
      return DEFAULT_SETTINGS[key];
    }

    return result.value as AppSettings[K];
  }

  async set<K extends keyof AppSettings>(key: K, value: AppSettings[K]): Promise<void> {
    const now = new Date();

    await this.db
      .insert(settings)
      .values({
        key,
        value: value as unknown,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: settings.key,
        set: {
          value: value as unknown,
          updatedAt: now,
        },
      });
  }

  async getAll(): Promise<AppSettings> {
    const rows = await this.db.select().from(settings);

    const result = { ...DEFAULT_SETTINGS };

    for (const row of rows) {
      if (row.key in DEFAULT_SETTINGS) {
        (result as Record<string, unknown>)[row.key] = row.value;
      }
    }

    return result;
  }

  async setAll(newSettings: Partial<AppSettings>): Promise<void> {
    const now = new Date();

    for (const [key, value] of Object.entries(newSettings)) {
      if (key in DEFAULT_SETTINGS && value !== undefined) {
        await this.db
          .insert(settings)
          .values({
            key,
            value: value as unknown,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: settings.key,
            set: {
              value: value as unknown,
              updatedAt: now,
            },
          });
      }
    }
  }

  async reset(): Promise<void> {
    await this.db.delete(settings);
  }

  async initializeDefaults(): Promise<void> {
    const now = new Date();

    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      const existing = await this.db
        .select()
        .from(settings)
        .where(eq(settings.key, key))
        .get();

      if (!existing) {
        await this.db.insert(settings).values({
          key,
          value: value as unknown,
          updatedAt: now,
        });
      }
    }
  }
}
