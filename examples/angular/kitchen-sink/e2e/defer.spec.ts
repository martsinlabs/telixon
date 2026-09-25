import { expect, test } from '@playwright/test';
import { open } from './helpers';

test('a field inside a deferred block hydrates on interaction and works', async ({ page }) => {
  await open(page);
  const input = page.getByTestId('deferred-input');
  await expect(input).toBeVisible();

  await input.click();
  await expect(page.getByTestId('deferred-picker').getByRole('button')).toBeEnabled();
  await input.pressSequentially('4155550132');

  await expect(page.getByTestId('deferred-value')).toHaveText('+14155550132');
});
