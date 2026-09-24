import type { RegionCode } from '@telixon/core/engine';
import { describe, expect, it } from 'vitest';
import { createNationalInputController } from '..';
import type { InputController } from '../../models';

function type(controller: InputController, digits: string): void {
  for (const character of digits) {
    const { value, selectionStart, selectionEnd } = controller.currentState;
    controller.insert(value, character, selectionStart, selectionEnd);
  }
}

// A region that shares its calling code with a primary region: CA and US under 1, JE and GB under 44, KZ and RU under 7.
describe('national controller: the region of a field without national digits', () => {
  it.each(['CA', 'JE', 'KZ'] as const)('an empty %s field reports its own region', (region: RegionCode) => {
    expect(createNationalInputController({ defaultRegion: region }).currentState.region).toBe(region);
  });

  it('keeps its region under a typed trunk prefix alone', () => {
    const controller = createNationalInputController({ defaultRegion: 'CA' });

    type(controller, '1');

    expect(controller.currentState.value).toBe('1');
    expect(controller.currentState.region).toBe('CA');
  });

  it('takes a region set on an empty field', () => {
    const controller = createNationalInputController({ defaultRegion: 'US' });

    controller.setRegion('CA');
    expect(controller.currentState.region).toBe('CA');

    type(controller, '4');
    expect(controller.currentState.region).toBe('CA');
  });

  it('still reports the primary region for a possible number that names no territory', () => {
    const controller = createNationalInputController({ defaultRegion: 'CA' });

    type(controller, '3101434444');

    expect(controller.currentState.region).toBe('US');
  });
});
