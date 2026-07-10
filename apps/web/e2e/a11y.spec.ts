import { test, expect } from './fixtures';
import { requestThroughProxy, startLocalOrigin } from './fixtures';

test.describe('accessibility basics', () => {
  test('icon buttons expose accessible names', async ({ page, appUrl }) => {
    await page.goto(appUrl);
    await expect(page.getByText(/Necto\s*Proxy/i).first()).toBeVisible();

    // Header icon buttons should be reachable by their aria-label.
    await expect(page.getByRole('button', { name: /Command palette/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Settings/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Switch to (light|dark) mode/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Download CA certificate/i })).toBeVisible();

    // Method filter controls are grouped and labelled.
    await expect(page.getByRole('group', { name: /Filter by HTTP method/i })).toBeVisible();

    // No visible <button> should be an unlabelled control. (Playwright's
    // getByRole name:'' matches ALL buttons, so compute the accessible name
    // directly: aria-label / text / title / aria-labelledby.)
    const unnamedButtons = await page.locator('button:visible').evaluateAll(
      (els) =>
        els.filter(
          (e) =>
            !(
              e.getAttribute('aria-label') ||
              e.textContent?.trim() ||
              e.getAttribute('title') ||
              e.getAttribute('aria-labelledby')
            )
        ).length
    );
    expect(unnamedButtons).toBe(0);
  });

  test('traffic rows are interactive and the detail panel is tabbed', async ({ page, appUrl }) => {
    const origin = await startLocalOrigin();
    try {
      await page.goto(appUrl);
      await expect(page.getByText(/^Live$/i).first()).toBeVisible();

      await requestThroughProxy(`${origin.baseUrl}/necto-a11y-probe`);

      const row = page.getByText('/necto-a11y-probe').first();
      await expect(row).toBeVisible();

      // Rows are interactive: activating one opens a tabbed detail panel.
      await row.click();
      await expect(page.getByRole('tablist', { name: /Request details/i })).toBeVisible();

      // Tabs are proper ARIA tabs with a selected state.
      const headersTab = page.getByRole('tab', { name: /^Headers$/i });
      await expect(headersTab).toBeVisible();
      await expect(headersTab).toHaveAttribute('aria-selected', /true|false/);

      // Close control on the detail panel is labelled.
      await expect(page.getByRole('button', { name: /Close detail panel/i })).toBeVisible();
    } finally {
      await origin.stop();
    }
  });
});
