import fs from 'node:fs/promises';
import path from 'node:path';
import type { MapLocalConfig } from '@nectoproxy/shared';
import type { ActionHandler, RuleResult } from './types.js';
import type { MatchContext } from '../RuleMatcher.js';

export class MapLocalAction implements ActionHandler<MapLocalConfig> {
  async executeRequest(config: MapLocalConfig, ctx: MatchContext): Promise<RuleResult> {
    // Construct file path from local path and request path
    const requestPath = ctx.path.split('?')[0]; // Remove query string
    const filePath = path.join(config.localPath, requestPath);

    try {
      // Check if file exists
      await fs.access(filePath);
      const body = await fs.readFile(filePath);
      const mimeType = this.getMimeType(filePath);

      return {
        handled: true,
        response: {
          status: 200,
          statusText: 'OK',
          headers: {
            'content-type': mimeType,
            'content-length': String(body.length),
          },
          body,
        },
      };
    } catch (error) {
      // File not found
      return {
        handled: true,
        response: {
          status: 404,
          statusText: 'Not Found',
          headers: {
            'content-type': 'text/plain',
          },
          body: Buffer.from(`Local file not found: ${filePath}`),
        },
      };
    }
  }

  private getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.html': 'text/html',
      '.htm': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.mjs': 'application/javascript',
      '.json': 'application/json',
      '.xml': 'application/xml',
      '.txt': 'text/plain',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.webp': 'image/webp',
      '.ico': 'image/x-icon',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.ttf': 'font/ttf',
      '.eot': 'application/vnd.ms-fontobject',
      '.pdf': 'application/pdf',
      '.zip': 'application/zip',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }
}
