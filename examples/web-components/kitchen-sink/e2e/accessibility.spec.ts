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

for (const path of ['/', '/react/', '/vue/']) {
  test(`${path} passes axe with the picker closed and open`, async ({ page }) => {
    await open(page, path);
    expect(await violations(page)).toEqual([]);

    await trigger(page).click();
    await search(page).fill('u');
    expect(await violations(page)).toEqual([]);
  });
}

test('the picker exposes the combobox and listbox pattern', async ({ page }) => {
  await open(page, '/');

  await expect(page.locator('telixon-region-picker')).toMatchAriaSnapshot(`
    - button "Select region, United States": "+1"
  `);

  await trigger(page).click();
  await search(page).fill('canada');

  await expect(page.locator('telixon-region-picker')).toMatchAriaSnapshot(`
    - button "Select region, United States" [expanded]: "+1"
    - combobox "Search" [expanded]: canada
    - listbox "Select region":
      - option "Canada +1"
  `);
});
