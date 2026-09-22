import { describe, expect, it } from 'vitest';
import { toWidgetWrite } from '../widget-write';

describe('toWidgetWrite', () => {
  it('hands the text over as it is where the field holds the calling code', () => {
    expect(toWidgetWrite('+442071838750', { mode: 'international', defaultRegion: 'US' })).toEqual({
      region: null,
      text: '+442071838750',
    });
  });

  it('takes the region and the national part apart where the calling code lives outside', () => {
    expect(
      toWidgetWrite('+442071838750', {
        mode: 'international',
        defaultRegion: 'US',
        display: { callingCodeInInput: false },
      }),
    ).toEqual({ region: 'GB', text: '2071838750' });
  });

  it('gives a national field the national format', () => {
    expect(toWidgetWrite('+442071838750', { mode: 'national', defaultRegion: 'US' })).toEqual({
      region: 'GB',
      text: '020 7183 8750',
    });
  });

  it('falls back to the national digits of a partial number', () => {
    expect(toWidgetWrite('+3361', { mode: 'national', defaultRegion: 'GB' })).toEqual({ region: 'FR', text: '61' });
  });

  it('leaves a partial number as it is while several regions share its calling code', () => {
    expect(toWidgetWrite('+1415', { mode: 'national', defaultRegion: 'GB' })).toEqual({ region: null, text: '+1415' });
  });

  it('leaves text without a plus, and a calling code no region owns, as they are', () => {
    const options = { mode: 'national', defaultRegion: 'US' } as const;

    expect(toWidgetWrite('4155550132', options)).toEqual({ region: null, text: '4155550132' });
    expect(toWidgetWrite('+999123', options)).toEqual({ region: null, text: '+999123' });
  });
});
