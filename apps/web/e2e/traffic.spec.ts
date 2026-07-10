import { test, expect } from './fixtures';
import { requestThroughProxy, startLocalOrigin } from './fixtures';

test.describe('traffic capture', () => {
  test('captures proxied requests and opens the detail panel', async ({ page, appUrl }) => {
    const origin = await startLocalOrigin();
    try {
      await page.goto(appUrl);
      await expect(page.getByText(/^Live$/i).first()).toBeVisible();

      // Generate traffic THROUGH the proxy to a local origin (deterministic,
      // works offline). Unique paths make rows easy to find.
      const probePath = '/necto-e2e-probe';
      const statuses = await Promise.all([
        requestThroughProxy(`${origin.baseUrl}${probePath}-1`),
        requestThroughProxy(`${origin.baseUrl}${probePath}-2`),
        requestThroughProxy(`${origin.baseUrl}/necto-e2e-notfound`),
      ]);
      expect(statuses).toContain(200);
      expect(statuses).toContain(404);

      // Reload so the captured traffic is loaded deterministically from the
      // backfill (avoids a race between request completion and live delivery).
      await page.reload({ waitUntil: 'networkidle' });

      // Rows appear in the virtualized traffic list.
      const firstRow = page.getByText(`${probePath}-1`).first();
      await expect(firstRow).toBeVisible();

      // Method + status badges render somewhere in the list.
      await expect(page.getByText(/^GET$/).first()).toBeVisible();
      await expect(page.getByText(/^200$/).first()).toBeVisible();
      await expect(page.getByText(/^404$/).first()).toBeVisible();

      // Clicking a row opens the detail panel with Headers/Response tabs.
      await firstRow.click();
      const tablist = page.getByRole('tablist', { name: /Request details/i });
      await expect(tablist).toBeVisible();
      await expect(page.getByRole('tab', { name: /^Headers$/i })).toBeVisible();
      await expect(page.getByRole('tab', { name: /^Response$/i })).toBeVisible();

      // Switching to the Response tab keeps the panel functional.
      await page.getByRole('tab', { name: /^Response$/i }).click();
      await expect(page.getByRole('tab', { name: /^Response$/i })).toHaveAttribute(
        'aria-selected',
        'true'
      );
    } finally {
      await origin.stop();
    }
  });
});
