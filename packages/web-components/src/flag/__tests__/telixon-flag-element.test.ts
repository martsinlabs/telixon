import { flagTransform } from '@telixon/web-sdk/flags';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { defineTelixonElements } from '../../define';
import { TelixonFlagElement } from '../telixon-flag-element';

beforeAll(() => defineTelixonElements());
afterEach(() => document.body.replaceChildren());

function transformOf(flag: HTMLElement): string {
  return flag.style.getPropertyValue('--tlx-flag-transform');
}

describe('telixon-flag', () => {
  it('paints the region from the sprite on its own box and follows the attribute', () => {
    document.body.innerHTML = '<telixon-flag region="US"></telixon-flag>';
    const flag: Element | null = document.body.firstElementChild;
    if (!(flag instanceof TelixonFlagElement)) throw new Error('No flag.');

    expect(flag.childNodes).toHaveLength(0);
    expect(flag.getAttribute('aria-hidden')).toBe('true');
    expect(transformOf(flag)).toBe(flagTransform('US'));

    flag.region = 'GB';
    expect(flag.getAttribute('region')).toBe('GB');
    expect(transformOf(flag)).toBe(flagTransform('GB'));

    flag.setAttribute('region', 'XX');
    expect(flag.region).toBeNull();
    expect(transformOf(flag)).toBe(flagTransform(null));
  });
});
