import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { open, search, trigger } from './helpers';

const tags: string[] = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function violations(page: Page): Promise<string[]> {
  const results = await new AxeBuilder({ page }).withTags(tags).analyze();
  return results.violations.map(
    (violation): string => `${violation.id}: ${violation.nodes.map((node) => node.target.join(' ')).join(', ')}`,
  );
}

test('the page passes axe with every picker closed', async ({ page }) => {
  await open(page);

  expect(await violations(page)).toEqual([]);
});

test('the page passes axe with a picker open and filtered', async ({ page }) => {
  await open(page);
  await trigger(page, 'outside').click();
  await search(page, 'outside').fill('u');

  expect(await violations(page)).toEqual([]);
});

test('the picker exposes the combobox and listbox pattern', async ({ page }) => {
  await open(page);
  const picker = page.getByTestId('outside-picker');

  await expect(picker).toMatchAriaSnapshot(`
    - button "Select region, United States": "+1"
  `);

  await trigger(page, 'outside').click();
  await search(page, 'outside').fill('canada');

  await expect(picker).toMatchAriaSnapshot(`
    - button "Select region, United States" [expanded]: "+1"
    - combobox "Search" [expanded]: canada
    - listbox "Select region":
      - option "Canada +1"
  `);
});

test('every option row is at least 24 pixels tall', async ({ page }) => {
  await open(page);
  await trigger(page, 'outside').click();

  const heights: number[] = await page
    .getByTestId('outside-picker')
    .getByRole('option')
    .evaluateAll((rows) => rows.slice(0, 5).map((row) => row.getBoundingClientRect().height));

  for (const height of heights) expect(height).toBeGreaterThanOrEqual(24);
});
