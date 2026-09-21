import { describe, expect, it } from 'vitest';
import { requiresRebuild } from '../requires-rebuild';

describe('requiresRebuild', () => {
  it('keeps the widget for the same object and for a structurally equal one', () => {
    const options = { mode: 'international', display: { callingCodeInInput: true, plusPrefix: 'fixed' } } as const;

    expect(requiresRebuild(options, options)).toBe(false);
    expect(
      requiresRebuild(options, { mode: 'international', display: { callingCodeInInput: true, plusPrefix: 'fixed' } }),
    ).toBe(false);
  });

  it('keeps the widget when only the filters change', () => {
    expect(
      requiresRebuild(
        { mode: 'international', regionFilter: ['US'] },
        { mode: 'international', regionFilter: ['CA'], numberTypeFilter: ['MOBILE'] },
      ),
    ).toBe(false);
  });

  it('needs a new widget for a new mode, default region, or display', () => {
    expect(requiresRebuild({ mode: 'international' }, { mode: 'national', defaultRegion: 'US' })).toBe(true);
    expect(requiresRebuild({ mode: 'national', defaultRegion: 'US' }, { mode: 'national', defaultRegion: 'CA' })).toBe(
      true,
    );
    expect(
      requiresRebuild(
        { mode: 'international', defaultRegion: 'US', display: { callingCodeInInput: true, plusPrefix: 'fixed' } },
        { mode: 'international', defaultRegion: 'US', display: { callingCodeInInput: false } },
      ),
    ).toBe(true);
  });

  it('needs a new widget when an option appears or disappears', () => {
    expect(requiresRebuild({ mode: 'international' }, { mode: 'international', strict: true })).toBe(true);
    expect(requiresRebuild({ mode: 'international', strict: true }, { mode: 'international' })).toBe(true);
  });
});
