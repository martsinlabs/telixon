import { describe, expect, it } from 'vitest';
import { resolveAnchor } from '../resolve-anchor';

function tree(): { host: HTMLElement; box: HTMLElement } {
  const field = document.createElement('div');
  field.innerHTML = `<div class="box"><span class="picker"></span></div><p class="hint"></p>`;
  return { host: field.querySelector<HTMLElement>('.picker')!, box: field.querySelector<HTMLElement>('.box')! };
}

describe('resolveAnchor', () => {
  it('hands an element over as it is', () => {
    const { host, box } = tree();

    expect(resolveAnchor(host, box)).toBe(box);
    expect(resolveAnchor(host, undefined)).toBe(undefined);
  });

  it('resolves a selector to the closest matching ancestor', () => {
    const { host, box } = tree();

    expect(resolveAnchor(host, '.box')).toBe(box);
  });

  it('leaves the picker as the anchor when no ancestor matches', () => {
    const { host } = tree();

    expect(resolveAnchor(host, '.hint')).toBe(undefined);
  });
});
