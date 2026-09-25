import { expect, test } from '@playwright/test';
import { open } from './helpers';

test('matInput owns the required and invalid attributes of the shared input', async ({ page }) => {
  await open(page);
  const input = page.getByTestId('material-input');

  await expect(input).toHaveAttribute('aria-required', 'true');
  await expect(input).not.toHaveAttribute('aria-invalid', 'true');

  await input.pressSequentially('2071');
  await input.blur();

  await expect(input).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByTestId('material-error')).toHaveText('This number is too short.');
  const describedBy: string | null = await input.getAttribute('aria-describedby');
  expect(describedBy).toContain('mat-mdc-error');
});

test('a pick inside the form field keeps the list open until the row is chosen', async ({ page }) => {
  await open(page);
  const picker = page.getByTestId('material-picker');

  await picker.getByRole('button').click();
  await expect(picker.locator('.tlx-region-picker__popup')).toBeVisible();
  await picker.getByRole('combobox').fill('united k');
  await picker.getByRole('option').first().click();

  await expect(picker.getByRole('button')).toContainText('+44');
  await expect(page.getByTestId('material-input')).toBeFocused();
});
