import { expect, test } from '@playwright/test';
import { open, options, search, trigger } from './helpers';

async function pick(page: import('@playwright/test').Page, id: string, name: string): Promise<void> {
  await trigger(page, id).click();
  await search(page, id).fill(name);
  await options(page, id).first().click();
}

test('a pick on an untouched field with the calling code inside takes that code', async ({ page }) => {
  await open(page);
  const input = page.getByTestId('inside-input');
  await expect(input).toHaveValue('1 ');

  await pick(page, 'inside', 'United Kingdom');

  await expect(input).toHaveValue('44 ');
  await expect(trigger(page, 'inside')).toHaveAccessibleName(/United Kingdom/);
});

test('a pick rewrites the calling code and keeps the national digits', async ({ page }) => {
  await open(page);
  const input = page.getByTestId('inside-input');
  await input.focus();
  await input.press('End');
  await input.pressSequentially('4165550132');
  await expect(input).toHaveValue('1 416-555-0132');
  await expect(page.getByTestId('inside-value')).toHaveText('+14165550132');

  await pick(page, 'inside', 'Germany');

  await expect(input).toHaveValue('49 4165 550132');
  await expect(trigger(page, 'inside')).toHaveAccessibleName(/Germany/);
  await expect(page.getByTestId('inside-value')).toHaveText('+494165550132');
});

test('a pick keeps the typed digits of a field with the calling code outside', async ({ page }) => {
  await open(page);
  const input = page.getByTestId('outside-input');
  await input.pressSequentially('2071838750');

  await pick(page, 'outside', 'United Kingdom');

  await expect(input).toHaveValue('20 7183 8750');
  await expect(page.getByTestId('outside-value')).toHaveText('+442071838750');
});
