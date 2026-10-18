import { describe, expect, it } from 'vitest';
import { defineElement } from '../utils/define-element';

describe('defineElement', () => {
  it('registers a tag once and throws for another class under it', () => {
    class First extends HTMLElement {}
    class Second extends HTMLElement {}
    defineElement('x-define-test', First);
    defineElement('x-define-test', First);
    expect(customElements.get('x-define-test')).toBe(First);
    expect(() => defineElement('x-define-test', Second)).toThrow(/already defined/);
  });
});
