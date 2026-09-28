import { expect, test, type Locator, type Page } from '@playwright/test';
import { open, trigger } from './helpers';

// A paste reaches the widget as a `beforeinput` of type `insertFromPaste`. The event is dispatched
// here so every engine runs the same path; the native clipboard path runs in Chromium below.
async function paste(page: Page, input: Locator, text: string, selectAll: boolean = false): Promise<void> {
  await input.focus();
  await input.evaluate(
    (element: HTMLInputElement, options: { text: string; selectAll: boolean }) => {
      if (options.selectAll) element.select();
      else element.setSelectionRange(element.value.length, element.value.length);
      element.dispatchEvent(
        new InputEvent('beforeinput', {
          inputType: 'insertFromPaste',
          data: options.text,
          bubbles: true,
          cancelable: true,
        }),
      );
    },
    { text, selectAll },
  );
}

test('a pasted international number moves the outside field to its region', async ({ page }) => {
  await open(page);
  const input = page.getByTestId('outside-input');
  await paste(page, input, '+44 20 7183 8750');

  await expect(input).toHaveValue('20 7183 8750');
  await expect(trigger(page, 'outside')).toHaveAccessibleName(/United Kingdom/);
  await expect(page.getByTestId('outside-value')).toHaveText('+442071838750');
  await expect(page.getByTestId('outside-error')).toHaveText('none');
});

test('a pasted number with a written trunk prefix enters without it', async ({ page }) => {
  await open(page);
  const input = page.getByTestId('outside-input');
  await paste(page, input, '+44 (0)20 7183 8750');

  await expect(input).toHaveValue('20 7183 8750');
  await expect(page.getByTestId('outside-value')).toHaveText('+442071838750');
});

test('a pasted international number replaces the seed of the inside field', async ({ page }) => {
  await open(page);
  const input = page.getByTestId('inside-input');
  await expect(input).toHaveValue('1 ');
  await paste(page, input, '+44 20 7183 8750');

  await expect(input).toHaveValue('44 20 7183 8750');
  await expect(trigger(page, 'inside')).toHaveAccessibleName(/United Kingdom/);
  await expect(page.getByTestId('inside-value')).toHaveText('+442071838750');
});

test('a pasted international number replaces a typed number', async ({ page }) => {
  await open(page);
  const input = page.getByTestId('outside-input');
  await input.pressSequentially('2015550123');
  await expect(input).toHaveValue('201-555-0123');
  await paste(page, input, '+44 20 7183 8750', true);

  await expect(input).toHaveValue('20 7183 8750');
  await expect(page.getByTestId('outside-value')).toHaveText('+442071838750');
});

test('a pasted international number enters the national field in its national format', async ({ page }) => {
  await open(page);
  const input = page.getByTestId('national-input');
  await paste(page, input, '+44 20 7183 8750');

  await expect(input).toHaveValue('020 7183 8750');
  await expect(page.getByTestId('national-value')).toHaveText('+442071838750');
});

test('a pasted number of another region stays literal in the national field', async ({ page }) => {
  await open(page);
  const input = page.getByTestId('national-input');
  await paste(page, input, '+1 201 555 0123');

  await expect(input).toHaveValue('12015550123');
  await expect(page.getByTestId('national-value')).toHaveText('null');
});

test('undo restores the value before the paste', async ({ page }) => {
  await open(page);
  const input = page.getByTestId('outside-input');
  await input.pressSequentially('201');
  await paste(page, input, '+44 20 7183 8750', true);
  await expect(input).toHaveValue('20 7183 8750');
  await input.press('ControlOrMeta+z');

  await expect(input).toHaveValue('201-');
  await expect(trigger(page, 'outside')).toHaveAccessibleName(/United States/);
});

test('the native clipboard paste takes the same path', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'clipboard permissions are granted in Chromium only');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await open(page);
  await page.evaluate(() => navigator.clipboard.writeText('+44 20 7183 8750'));
  const input = page.getByTestId('outside-input');
  await input.focus();
  await page.keyboard.press('ControlOrMeta+v');

  await expect(input).toHaveValue('20 7183 8750');
  await expect(page.getByTestId('outside-value')).toHaveText('+442071838750');
});
