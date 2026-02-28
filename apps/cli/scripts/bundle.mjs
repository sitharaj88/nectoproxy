import esbuild from 'esbuild';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

await esbuild.build({
  entryPoints: [resolve(__dirname, '../src/index.ts')],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  outfile: resolve(__dirname, '../dist/index.js'),
  banner: {
    js: '#!/usr/bin/env node',
  },
  sourcemap: true,
  plugins: [{
    name: 'externalize-deps',
    setup(build) {
      // Externalize all non-relative, non-workspace imports
      build.onResolve({ filter: /^[^./]/ }, (args) => {
        // Bundle workspace packages (inline them)
        if (args.path.startsWith('@nectoproxy/')) {
          return undefined;
        }
        // Externalize everything else (npm packages, node builtins)
        return { path: args.path, external: true };
      });
    },
  }],
});

console.log('Bundle complete.');
