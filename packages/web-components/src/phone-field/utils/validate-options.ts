import { PHONE_FIELD_TAG } from '../../constants/tag-names';
import { isRecord } from '../../utils/is-record';
import { isNumberType } from '../../utils/number-type';
import { isPlusPrefixMode } from '../../utils/plus-prefix';
import { isRegionCode } from '../../utils/region-code';
import type { TelixonPhoneFieldOptions } from '../models';

function invalid(field: string, value: unknown): TypeError {
  return new TypeError(`<${PHONE_FIELD_TAG}> does not accept ${field} ${JSON.stringify(value)} in its options.`);
}

/** The error for an option that only makes sense next to a default region. */
function needs(condition: string): TypeError {
  return new TypeError(`<${PHONE_FIELD_TAG}> needs defaultRegion in its options when ${condition}.`);
}

/**
 * The options as given, once every value in them is one the engine knows and every option that
 * needs a default region has one. The types say so at compile time. This says so for code that
 * reaches the property without them.
 */
export function validateOptions(options: TelixonPhoneFieldOptions): TelixonPhoneFieldOptions {
  const mode: string = options.mode;
  if (mode !== 'international' && mode !== 'national') throw invalid('mode', mode);
  const defaultRegion: unknown = options.defaultRegion;
  if (defaultRegion !== undefined && (typeof defaultRegion !== 'string' || !isRegionCode(defaultRegion))) {
    throw invalid('defaultRegion', defaultRegion);
  }
  if (mode === 'national' && defaultRegion === undefined) throw needs('mode is "national"');
  const display: unknown = options.mode === 'international' ? options.display : undefined;
  if (display !== undefined && !isRecord(display)) throw invalid('display', display);
  if (display !== undefined) {
    if (display.callingCodeInInput === false && defaultRegion === undefined) {
      throw needs('display.callingCodeInInput is false');
    }
    const plusPrefix: unknown = display.plusPrefix;
    if (plusPrefix !== undefined && (typeof plusPrefix !== 'string' || !isPlusPrefixMode(plusPrefix))) {
      throw invalid('display.plusPrefix', plusPrefix);
    }
  }
  for (const region of options.regionFilter ?? []) if (!isRegionCode(region)) throw invalid('regionFilter', region);
  for (const numberType of options.numberTypeFilter ?? []) {
    if (!isNumberType(numberType)) throw invalid('numberTypeFilter', numberType);
  }
  const placeholderNumberType: unknown = options.placeholderNumberType;
  if (
    placeholderNumberType !== undefined &&
    (typeof placeholderNumberType !== 'string' || !isNumberType(placeholderNumberType))
  ) {
    throw invalid('placeholderNumberType', placeholderNumberType);
  }
  return options;
}
