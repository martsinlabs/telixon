import { expect, test } from '@playwright/test';
import { input, open, submitted, value } from './helpers';

test('the server renders the field, the picker, and the input', async ({ request }) => {
  const html: string = await (await request.get('/react/')).text();

  expect(html).toMatch(/<telixon-phone-field[^>]*name="phone"[^>]*>/);
  expect(html).toContain('<telixon-region-picker></telixon-region-picker>');
  expect(html).toMatch(/<input[^>]*id="phone-input"[^>]*>/);
});

test('the page hydrates without a mismatch', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message): void => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error): void => {
    errors.push(error.message);
  });

  await open(page, '/react/');
  await input(page).pressSequentially('4155550132');

  await expect(value(page)).toHaveText('+14155550132');
  expect(errors).toEqual([]);
});

test('typing before hydration reaches the form after it', async ({ page }) => {
  // The client bundle is held back so the server-rendered input takes the keystrokes on its own.
  await page.route('**/assets/react-*.js', async (route): Promise<void> => {
    await new Promise((resolve): void => {
      setTimeout(resolve, 1500);
    });
    await route.continue();
  });
  await page.goto('/react/', { waitUntil: 'commit' });
  await input(page).pressSequentially('4155550132');

  await expect(value(page)).toHaveText('+14155550132');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(submitted(page)).toHaveText('+14155550132');
});
