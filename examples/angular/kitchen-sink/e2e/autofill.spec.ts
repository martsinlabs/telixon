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

// The CDP recipe below is the harness for the day core reads every shape Chrome fills.
for (const profile of profiles) {
  test(`autofill of ${profile.title} into a field set to that region, calling code outside`, async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'The Autofill domain exists in Chromium only');
    // Deferred to core. Chrome fills the national number with its trunk prefix (02071838750, 03012345678) or, for a US
    // profile, either 2015550123 or the plus-less whole number 12015550123. The field rejects the trunk prefix and the
    // repeated calling code; only the bare national digits parse today.
    test.fixme(true, 'core rejects a trunk prefix or a repeated calling code after the picked region');
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

  test.fixme(`autofill of ${profile.title} into the calling-code-inside field`, async () => {
    // Deferred to core: national digits filled without a plus (2015550123, 02071838750) are read as a calling code.
  });
}
