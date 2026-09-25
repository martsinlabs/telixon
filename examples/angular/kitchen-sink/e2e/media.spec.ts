import { expect, test } from '@playwright/test';
import { open, trigger } from './helpers';

test('the row under the cursor keeps an outline in forced colors', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Playwright emulates forced colors in Chromium only');
  await page.emulateMedia({ forcedColors: 'active' });
  await open(page);
  await trigger(page, 'outside').click();
  await page.keyboard.press('ArrowDown');

  const active = page.getByTestId('outside-picker').locator('[role="option"][data-active]');
  await expect(active).toHaveCount(1);
  const outline = await active.evaluate((row) => {
    const style = getComputedStyle(row);
    return {
      style: style.outlineStyle,
      width: style.outlineWidth,
      forced: matchMedia('(forced-colors: active)').matches,
    };
  });

  expect(outline).toEqual({ style: 'solid', width: '2px', forced: true });
});

test('nothing in the picker animates', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page);
  await trigger(page, 'outside').click();

  const durations: string[] = await page
    .getByTestId('outside-picker')
    .locator('*')
    .evaluateAll((nodes) =>
      nodes.map((node) => getComputedStyle(node).transitionDuration + '|' + getComputedStyle(node).animationName),
    );

  expect(durations.every((entry: string): boolean => entry === '0s|none')).toBe(true);
});

test('the page has no horizontal scroll at 320 pixels', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await open(page);

  const overflowBefore: boolean = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  await trigger(page, 'outside').click();
  const overflowAfter: boolean = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );

  expect(overflowBefore).toBe(false);
  expect(overflowAfter).toBe(false);
});

test('the list mirrors under right-to-left text', async ({ page }) => {
  await open(page);
  await trigger(page, 'rtl').click();

  const [triggerBox, popupBox] = await Promise.all([
    trigger(page, 'rtl').boundingBox(),
    page.getByTestId('rtl-picker').locator('.tlx-region-picker__popup').boundingBox(),
  ]);

  expect(triggerBox).not.toBeNull();
  expect(popupBox).not.toBeNull();
  expect(
    Math.abs((triggerBox?.x ?? 0) + (triggerBox?.width ?? 0) - ((popupBox?.x ?? 0) + (popupBox?.width ?? 0))),
  ).toBeLessThan(2);
});
