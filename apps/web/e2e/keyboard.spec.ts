import { test, expect } from './fixtures';

test.describe('keyboard', () => {
  test('Cmd/Ctrl+K opens the command palette and Escape closes it', async ({ page, appUrl }) => {
    await page.goto(appUrl);
    await expect(page.getByText(/Necto\s*Proxy/i).first()).toBeVisible();

    // Ensure focus is on the page body (not an input) so the hotkey fires.
    await page.locator('body').click();

    const paletteInput = page.getByPlaceholder(/Type a command or search/i);
    await expect(paletteInput).toBeHidden();

    // react-hotkeys-hook binds `mod+k` -> Meta+K on macOS / Ctrl+K elsewhere.
    await page.keyboard.press('Meta+k');
    if (!(await paletteInput.isVisible().catch(() => false))) {
      await page.keyboard.press('Control+k');
    }
    await expect(paletteInput).toBeVisible();

    // Escape closes the palette.
    await page.keyboard.press('Escape');
    await expect(paletteInput).toBeHidden();
  });
});
