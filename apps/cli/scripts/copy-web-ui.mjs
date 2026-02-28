import { cpSync, chmodSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = resolve(__dirname, '../../web/dist');
const dest = resolve(__dirname, '../dist/web-ui');

cpSync(src, dest, { recursive: true });
chmodSync(resolve(__dirname, '../dist/index.js'), 0o755);
console.log('Copied web UI assets to dist/web-ui');
