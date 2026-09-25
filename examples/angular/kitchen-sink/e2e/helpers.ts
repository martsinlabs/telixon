import { expect, type Locator, type Page } from '@playwright/test';

/** Loads the page and waits until the fields have attached, which the trigger's enabled state shows. */
export async function open(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.getByTestId('outside-picker').getByRole('button')).toBeEnabled();
}

export function trigger(page: Page, id: string): Locator {
  return page.getByTestId(`${id}-picker`).getByRole('button');
}

export function popup(page: Page, id: string): Locator {
  return page.getByTestId(`${id}-picker`).locator('.tlx-region-picker__popup');
}

export function search(page: Page, id: string): Locator {
  return page.getByTestId(`${id}-picker`).getByRole('combobox');
}

export function options(page: Page, id: string): Locator {
  return page.getByTestId(`${id}-picker`).getByRole('option');
}

export async function pick(page: Page, id: string, name: string): Promise<void> {
  await trigger(page, id).click();
  await search(page, id).fill(name);
  await options(page, id).first().click();
}
