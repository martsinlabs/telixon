import { expect, test, type Page } from '@playwright/test';
import { input, open, pick, value } from './helpers';

type AddressField = { name: string; value: string };

// Chrome's own autofill through the DevTools Protocol, with the values Chrome stores for a profile.
async function autofill(page: Page, fields: AddressField[]): Promise<void> {
  const session = await page.context().newCDPSession(page);
  await session.send('Autofill.enable');
  await session.send('Autofill.setAddresses', { addresses: [{ fields }] });
  const { root } = await session.send('DOM.getDocument', { depth: 0 });
  const { nodeId } = await session.send('DOM.querySelector', { nodeId: root.nodeId, selector: '#phone-input' });
  const { node } = await session.send('DOM.describeNode', { nodeId });
  await session.send('Autofill.trigger', { fieldId: node.backendNodeId, address: { fields } });
}

const profiles: { title: string; country: string; phone: string; expected: string }[] = [
  { title: 'a United States profile', country: 'United States', phone: '+12015550123', expected: '+12015550123' },
  { title: 'a United Kingdom profile', country: 'United Kingdom', phone: '+442071838750', expected: '+442071838750' },
];

// Chrome fills the number of the profile in its own national spelling, which the field reads against its region.
for (const profile of profiles) {
  test(`autofill of ${profile.title} into a field set to that region`, async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'The Autofill domain exists in Chromium only');
    await open(page, '/');
    await pick(page, profile.country);

    await autofill(page, [
      { name: 'NAME_FULL', value: 'Jane Doe' },
      { name: 'ADDRESS_HOME_COUNTRY', value: profile.country },
      { name: 'PHONE_HOME_WHOLE_NUMBER', value: profile.phone },
    ]);

    await expect(value(page)).toHaveText(profile.expected);
    expect(await input(page).inputValue()).not.toBe('');
  });
}
