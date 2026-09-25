import { expect, test } from '@playwright/test';
import { open } from './helpers';

declare const ngDevMode: { hydratedComponents: number; componentsSkippedHydration: number };

test('the server renders the fields and a disabled picker', async ({ request }) => {
  const html: string = await (await request.get('/')).text();

  expect(html).toContain('data-testid="outside-input"');
  expect(html).toMatch(/data-testid="outside-picker"[\s\S]*?<button[^>]*disabled/);
});

test('the page hydrates without errors or skipped components', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message): void => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await open(page);

  const stats = await page.evaluate(() => ({
    hydrated: ngDevMode.hydratedComponents,
    skipped: ngDevMode.componentsSkippedHydration,
  }));

  expect(stats.hydrated).toBeGreaterThan(0);
  expect(stats.skipped).toBe(0);
  expect(errors.filter((text: string): boolean => /NG05\d\d/.test(text))).toEqual([]);
});

test('a field works after hydration', async ({ page }) => {
  await open(page);

  await page.getByTestId('outside-input').pressSequentially('4155550132');

  await expect(page.getByTestId('outside-value')).toHaveText('+14155550132');
});

test('typing before hydration reaches the form after it', async ({ page }) => {
  // The client bundle is held back so the server-rendered input takes the keystrokes on its own.
  await page.route('**/main.js', async (route): Promise<void> => {
    await new Promise((resolve): void => {
      setTimeout(resolve, 1500);
    });
    await route.continue();
  });
  await page.goto('/');
  await page.getByTestId('outside-input').pressSequentially('4155550132');

  await expect(page.getByTestId('outside-value')).toHaveText('+14155550132');
});
