import { expect, test, type Page } from '@playwright/test';
import { open, pick } from './helpers';

type AddressField = { name: string; value: string };

// Chrome's own autofill through the DevTools Protocol, with the values Chrome stores for a profile.
async function autofill(page: Page, testId: string, fields: AddressField[]): Promise<void> {
  const session = await page.context().newCDPSession(page);
  await session.send('Autofill.enable');
  await session.send('Autofill.setAddresses', { addresses: [{ fields }] });
  const { root } = await session.send('DOM.getDocument', { depth: 0 });
  const { nodeId } = await session.send('DOM.querySelector', {
    nodeId: root.nodeId,
    selector: `[data-testid="${testId}"]`,
  });
  const { node } = await session.send('DOM.describeNode', { nodeId });
  await session.send('Autofill.trigger', { fieldId: node.backendNodeId, address: { fields } });
}

const profiles: { title: string; country: string; region: string; phone: string; expected: string }[] = [
  {
    title: 'a United Kingdom profile',
    country: 'United Kingdom',
    region: 'United Kingdom',
    phone: '+442071838750',
    expected: '+442071838750',
  },
  {
    title: 'a United States profile',
    country: 'United States',
    region: 'United States',
    phone: '+12015550123',
    expected: '+12015550123',
  },
  {
    title: 'a German profile',
    country: 'Germany',
    region: 'Germany',
    phone: '+493012345678',
    expected: '+493012345678',
  },
];

// Chrome fills the number of the profile in its own national spelling, trunk prefix and all.
for (const profile of profiles) {
  test(`autofill of ${profile.title} into a field set to that region, calling code outside`, async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'The Autofill domain exists in Chromium only');
    await open(page);
    await pick(page, 'autofill-outside', profile.region);

    await autofill(page, 'autofill-outside-input', [
      { name: 'NAME_FULL', value: 'Jane Doe' },
      { name: 'EMAIL_ADDRESS', value: 'jane@example.com' },
      { name: 'ADDRESS_HOME_COUNTRY', value: profile.country },
      { name: 'PHONE_HOME_WHOLE_NUMBER', value: profile.phone },
    ]);

    const readout = page.getByTestId('autofill-outside-value');
    await expect(readout)
      .not.toHaveText('null', { timeout: 2000 })
      .catch((): void => undefined);
    const filled: string = await page.getByTestId('autofill-outside-input').inputValue();
    const value: string = (await readout.textContent()) ?? '';
    expect({ filled, value }).toEqual({ filled, value: profile.expected });
  });
}

// The second form has no picker. Its field stays on its own default region.
test('autofill of a matching profile into the calling-code-inside field', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'The Autofill domain exists in Chromium only');
  await open(page);

  await autofill(page, 'autofill-inside-input', [
    { name: 'NAME_FULL', value: 'Jane Doe' },
    { name: 'EMAIL_ADDRESS', value: 'jane@example.com' },
    { name: 'ADDRESS_HOME_COUNTRY', value: 'United States' },
    { name: 'PHONE_HOME_WHOLE_NUMBER', value: '+12015550123' },
  ]);

  await expect(page.getByTestId('autofill-inside-value')).toHaveText('+12015550123');
  await expect(page.getByTestId('autofill-inside-input')).toHaveValue('1 201-555-0123');
});

test('autofill of another country into a field pinned to one reads whatever Chrome fills', async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'The Autofill domain exists in Chromium only');
  await open(page);

  await autofill(page, 'autofill-inside-input', [
    { name: 'NAME_FULL', value: 'Jane Doe' },
    { name: 'EMAIL_ADDRESS', value: 'jane@example.com' },
    { name: 'ADDRESS_HOME_COUNTRY', value: 'United Kingdom' },
    { name: 'PHONE_HOME_WHOLE_NUMBER', value: '+442071838750' },
  ]);

  // Chrome fills either spelling of the profile's number. The national one carries no country, so
  // a field pinned to the United States keeps it as text with no value. The international one
  // names its country and resolves.
  const input = page.getByTestId('autofill-inside-input');
  await expect(input).not.toHaveValue('1 ');
  const filled: string = await input.inputValue();
  const outcomes: Record<string, string> = {
    '02071838750': 'null',
    '44 20 7183 8750': '+442071838750',
  };
  expect(Object.keys(outcomes), `Chrome filled ${JSON.stringify(filled)}`).toContain(filled);
  await expect(page.getByTestId('autofill-inside-value')).toHaveText(outcomes[filled] ?? '');
});
