import { expect, test } from '@playwright/test';
import { open, pick } from './helpers';

test('a Signal Forms field holds E.164 and reports the fault with a message', async ({ page }) => {
  await open(page);
  const input = page.getByTestId('signal-input');

  await input.pressSequentially('4155');
  await input.blur();
  await expect(page.getByTestId('signal-error')).toHaveText('This number is too short.');
  await expect(page.getByTestId('signal-state')).toHaveText('touched pristine');

  await input.focus();
  await input.pressSequentially('550132');
  await expect(page.getByTestId('signal-value')).toHaveText('+14155550132');
  await expect(page.getByTestId('signal-error')).toHaveText('none');
  await expect(page.getByTestId('signal-state')).toHaveText('touched dirty');
});

test('a pick moves the Signal Forms field to the region', async ({ page }) => {
  await open(page);
  await pick(page, 'signal', 'United Kingdom');
  await page.getByTestId('signal-input').pressSequentially('2071838750');

  await expect(page.getByTestId('signal-picker').getByRole('button')).toContainText('+44');
  await expect(page.getByTestId('signal-value')).toHaveText('+442071838750');
});

test('inside a Material form field, matInput reports the Signal Forms state', async ({ page }) => {
  await open(page);
  const input = page.getByTestId('signal-material-input');

  await expect(input).toHaveAttribute('aria-required', 'true');
  await expect(page.locator('#signal-material .mat-mdc-form-field-required-marker')).toBeVisible();
  await input.focus();
  await expect(page.locator('#signal-material .mdc-floating-label--float-above')).toBeVisible();
  await input.pressSequentially('2071');
  await input.blur();

  await expect(input).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByTestId('signal-material-error')).toHaveText('This number is too short.');
  const describedBy: string | null = await input.getAttribute('aria-describedby');
  expect(describedBy).toContain('mat-mdc-error');
});
