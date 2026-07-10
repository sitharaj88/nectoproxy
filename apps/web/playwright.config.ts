import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E config for NectoProxy.
 *
 * These tests drive the REAL built app: a worker-scoped fixture (see
 * ./e2e/fixtures.ts) spawns `apps/cli/dist/index.js start --no-open`, captures
 * the session token printed on stdout, and hands the tokened UI URL to tests.
 *
 * We deliberately do NOT use Playwright's `webServer` option — it cannot surface
 * the randomly-generated session token that the API requires, so the fixture
 * owns the server lifecycle instead.
 */
export default defineConfig({
  testDir: './e2e',
  // The app writes to a shared SQLite session and the CLI binds fixed ports
  // (8888/8889), so a single server is shared across the whole run.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  // Generous timeouts: the CLI needs a few seconds to boot and real traffic
  // must round-trip through the proxy.
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [['list']],
  use: {
    // baseURL is intentionally unset — tests navigate to the tokened URL that
    // the fixture provides via `appUrl`.
    trace: 'on-first-retry',
    ignoreHTTPSErrors: true,
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 },
    },
  ],
});
