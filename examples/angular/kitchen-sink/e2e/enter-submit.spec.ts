import { expect, test } from '@playwright/test';
import { open, search, trigger } from './helpers';

test('Enter in the picker search field does not submit the form around it', async ({ page }) => {
  await open(page);
  await trigger(page, 'form').click();
  await search(page, 'form').fill('canada');

  await page.keyboard.press('Enter');

  await expect(page.getByTestId('form-submissions')).toHaveText('0');
  await expect(trigger(page, 'form')).toContainText('+1');
});

test('Enter in the phone field submits the form', async ({ page, browserName }) => {
  // Deferred to web-sdk: its beforeinput handler prevents Chromium's insertLineBreak, which cancels implicit submission.
  test.fail(browserName === 'chromium', 'web-sdk swallows Enter in Chromium');
  await open(page);
  await page.getByTestId('form-input').pressSequentially('4155550132');

  await page.keyboard.press('Enter');

  await expect(page.getByTestId('form-submissions')).toHaveText('1');
});
