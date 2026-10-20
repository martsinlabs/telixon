import { expect, type Locator, type Page } from '@playwright/test';

/** Loads a page and waits until the field has attached, which the picker's enabled trigger shows. */
export async function open(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await expect(trigger(page)).toBeEnabled();
}

export function input(page: Page): Locator {
  return page.getByLabel('Phone');
}

export function trigger(page: Page): Locator {
  return page.getByRole('button', { name: /^Select region/ });
}

export function search(page: Page): Locator {
  return page.getByRole('combobox');
}

export function options(page: Page): Locator {
  return page.getByRole('option');
}

export function value(page: Page): Locator {
  return page.locator('output#value');
}

export function submitted(page: Page): Locator {
  return page.locator('output#submitted');
}

export async function pick(page: Page, name: string): Promise<void> {
  await trigger(page).click();
  await search(page).fill(name);
  await options(page).first().click();
}

export async function save(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Save' }).click();
}
