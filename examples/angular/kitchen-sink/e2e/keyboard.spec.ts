import { expect, test } from '@playwright/test';
import { open, options, popup, search, trigger } from './helpers';

test.beforeEach(async ({ page }) => {
  await open(page);
});

test('arrows move the cursor, Enter picks, Escape closes and returns focus', async ({ page }) => {
  await trigger(page, 'outside').click();
  await expect(popup(page, 'outside')).toBeVisible();
  await expect(search(page, 'outside')).toBeFocused();

  // The cursor opens on the selected row, United States, with Canada and the United Kingdom pinned after it.
  await page.keyboard.press('ArrowDown');
  await expect(search(page, 'outside')).toHaveAttribute('aria-activedescendant', /-CA$/);
  await page.keyboard.press('ArrowDown');
  await expect(search(page, 'outside')).toHaveAttribute('aria-activedescendant', /-GB$/);
  await expect(options(page, 'outside').filter({ hasText: 'United Kingdom' })).toHaveAttribute('data-active', 'true');

  await page.keyboard.press('Enter');
  await expect(popup(page, 'outside')).toBeHidden();
  await expect(trigger(page, 'outside')).toContainText('+44');
  await expect(page.getByTestId('outside-input')).toHaveAttribute('placeholder', '7400 123456');

  await trigger(page, 'outside').click();
  await page.keyboard.press('Escape');
  await expect(popup(page, 'outside')).toBeHidden();
  await expect(trigger(page, 'outside')).toBeFocused();
});

test('typing narrows the list and a pick follows the field into the form value', async ({ page }) => {
  await trigger(page, 'outside').click();
  await search(page, 'outside').fill('united k');

  await expect(options(page, 'outside')).toHaveCount(1);
  await expect(options(page, 'outside').first()).toContainText('United Kingdom');

  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await page.getByTestId('outside-input').pressSequentially('2071838750');

  await expect(page.getByTestId('outside-value')).toHaveText('+442071838750');
});

test('a press outside closes the list', async ({ page }) => {
  await trigger(page, 'outside').click();
  await page.getByRole('heading', { level: 1 }).click();

  await expect(popup(page, 'outside')).toBeHidden();
});

// Focus sits in the search field while the list is open, where Home and End belong to its text.
test('Home and End leave the row cursor where it is', async ({ page }) => {
  await trigger(page, 'outside').click();
  await page.keyboard.press('ArrowDown');
  const active = options(page, 'outside').filter({ has: page.locator('[data-active="true"]') });
  const activeRow = page.getByTestId('outside-picker').locator('[data-active="true"]');
  const before = await activeRow.textContent();

  await page.keyboard.press('Home');
  await page.keyboard.press('End');

  await expect(activeRow).toHaveText(before ?? '');
  await expect(active).toHaveCount(await active.count());
});
