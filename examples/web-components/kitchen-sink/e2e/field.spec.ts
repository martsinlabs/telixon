import { expect, test } from '@playwright/test';
import { input, open, pick, save, submitted, trigger, value } from './helpers';

const pages: { title: string; path: string }[] = [
  { title: 'the static page', path: '/' },
  { title: 'the React page', path: '/react/' },
  { title: 'the Vue page', path: '/vue/' },
];

for (const { title, path } of pages) {
  test.describe(title, () => {
    test('formats what the user types and reports the number in E.164', async ({ page }) => {
      await open(page, path);
      await expect(input(page)).toHaveValue('');
      await expect(input(page)).toHaveAttribute('placeholder', '201-555-0123');

      await input(page).pressSequentially('4155550132');

      await expect(input(page)).toHaveValue('415-555-0132');
      await expect(value(page)).toHaveText('+14155550132');
    });

    test('submits the number in E.164 under its name', async ({ page }) => {
      await open(page, path);
      await input(page).pressSequentially('4155550132');

      await save(page);

      await expect(submitted(page)).toHaveText('+14155550132');
    });

    test('blocks the submission of an empty required field', async ({ page }) => {
      await open(page, path);

      await save(page);

      await expect(submitted(page)).toHaveText('none');
      expect(await page.evaluate(() => document.querySelector('form')?.checkValidity())).toBe(false);
    });

    test('blocks the submission of a partial number', async ({ page }) => {
      await open(page, path);
      await input(page).pressSequentially('415');

      await save(page);

      await expect(submitted(page)).toHaveText('none');
      await expect(value(page)).toHaveText('null');
    });

    test('takes the region from the picker', async ({ page }) => {
      await open(page, path);
      await expect(trigger(page)).toHaveAccessibleName('Select region, United States');
      await expect(trigger(page)).toHaveText('+1');

      await pick(page, 'United Kingdom');

      await expect(trigger(page)).toHaveAccessibleName('Select region, United Kingdom');
      await expect(trigger(page)).toHaveText('+44');
      await expect(input(page)).toBeFocused();
      await input(page).pressSequentially('2071838750');
      await expect(input(page)).toHaveValue('20 7183 8750');
      await expect(value(page)).toHaveText('+442071838750');
    });
  });
}
