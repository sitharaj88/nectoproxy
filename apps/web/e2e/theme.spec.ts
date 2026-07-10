import { test, expect } from './fixtures';

test.describe('theme', () => {
  test('toggling theme updates the root class and background', async ({ page, appUrl }) => {
    await page.goto(appUrl);

    const html = page.locator('html');

    // The app is dark-first; wait for a resolved theme class to be applied.
    await expect(html).toHaveClass(/\b(dark|light)\b/);
    const startedDark = (await html.getAttribute('class'))?.includes('dark');

    const bgBefore = await page.evaluate(
      () => getComputedStyle(document.body).backgroundColor
    );

    // Toggle via the header theme button (label flips with the current theme).
    await page.getByRole('button', { name: /Switch to (light|dark) mode/i }).click();

    if (startedDark) {
      await expect(html).toHaveClass(/\blight\b/);
      await expect(html).not.toHaveClass(/\bdark\b/);
    } else {
      await expect(html).toHaveClass(/\bdark\b/);
    }

    // Background colour should change after the toggle.
    await expect
      .poll(async () => page.evaluate(() => getComputedStyle(document.body).backgroundColor))
      .not.toBe(bgBefore);
  });

  test('respects a persisted localStorage theme', async ({ page, appUrl }) => {
    await page.goto(appUrl);
    await page.evaluate(() => localStorage.setItem('theme', 'light'));
    await page.reload();
    await expect(page.locator('html')).toHaveClass(/\blight\b/);

    await page.evaluate(() => localStorage.setItem('theme', 'dark'));
    await page.reload();
    await expect(page.locator('html')).toHaveClass(/\bdark\b/);
  });
});
