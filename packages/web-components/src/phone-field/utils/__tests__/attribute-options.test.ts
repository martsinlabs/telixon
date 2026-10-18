import { describe, expect, it } from 'vitest';
import { attributeOptions } from '../attribute-options';

function host(attributes: Record<string, string>): Element {
  const element: HTMLElement = document.createElement('div');
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
  return element;
}

describe('attributeOptions', () => {
  it('maps the attributes onto the options of createPhoneInput', () => {
    expect(attributeOptions(host({}))).toEqual({ mode: 'international' });
    expect(attributeOptions(host({ 'default-region': 'US', 'plus-prefix': 'fixed', strict: '' }))).toEqual({
      mode: 'international',
      defaultRegion: 'US',
      display: { callingCodeInInput: true, plusPrefix: 'fixed' },
      strict: true,
    });
    expect(
      attributeOptions(host({ mode: 'national', 'default-region': 'GB', 'number-type-filter': 'MOBILE' })),
    ).toEqual({
      mode: 'national',
      defaultRegion: 'GB',
      numberTypeFilter: ['MOBILE'],
    });
    expect(attributeOptions(host({ 'default-region': 'US', 'placeholder-number-type': 'MOBILE' }))).toEqual({
      mode: 'international',
      defaultRegion: 'US',
      placeholderNumberType: 'MOBILE',
    });
  });

  it('rejects a value no option accepts', () => {
    expect(() => attributeOptions(host({ 'default-region': 'XX' }))).toThrow(/default-region="XX"/);
    expect(() => attributeOptions(host({ mode: 'local' }))).toThrow(/mode="local"/);
    expect(() => attributeOptions(host({ 'region-filter': 'US, ZZ' }))).toThrow(/region-filter="ZZ"/);
    expect(() => attributeOptions(host({ 'calling-code-in-input': 'no' }))).toThrow(/calling-code-in-input="no"/);
    expect(() => attributeOptions(host({ mode: 'national' }))).toThrow(/needs default-region/);
    expect(() => attributeOptions(host({ 'calling-code-in-input': 'false' }))).toThrow(/needs default-region/);
  });
});
