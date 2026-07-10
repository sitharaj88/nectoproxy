import { test, expect } from './fixtures';

test.describe('smoke', () => {
  test('app loads with header, filter bar and empty state', async ({ page, appUrl }) => {
    await page.goto(appUrl);

    // Brand wordmark ("NectoProxy", rendered across two spans).
    await expect(page.getByText(/Necto\s*Proxy/i).first()).toBeVisible();

    // Live/connected status indicator in the header.
    await expect(page.getByText(/^(Live|Offline)$/i).first()).toBeVisible();
    // Once the socket connects the UI should report "Live".
    await expect(page.getByText(/^Live$/i).first()).toBeVisible();

    // Filter bar renders (URL/host filter input + method filter group).
    await expect(page.getByPlaceholder(/Filter by URL or host|Regex pattern/i)).toBeVisible();
    await expect(page.getByRole('group', { name: /Filter by HTTP method/i })).toBeVisible();

    // Empty state — no traffic yet at the start of the run.
    await expect(page.getByText(/Waiting for traffic/i)).toBeVisible();
    await expect(page.getByText(/localhost:8888/i)).toBeVisible();
  });
});
