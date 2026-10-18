import type { NumberType, PlusPrefixMode, RegionCode } from '@telixon/core';
import { FALSE_VALUE, TRUE_VALUE } from '../../constants/attribute-values';
import { PHONE_FIELD_TAG } from '../../constants/tag-names';
import { listAttribute } from '../../utils/list-attribute';
import { isNumberType } from '../../utils/number-type';
import { isPlusPrefixMode } from '../../utils/plus-prefix';
import { isRegionCode } from '../../utils/region-code';
import {
  CALLING_CODE_IN_INPUT_ATTRIBUTE,
  DEFAULT_REGION_ATTRIBUTE,
  MODE_ATTRIBUTE,
  NUMBER_TYPE_FILTER_ATTRIBUTE,
  PLACEHOLDER_NUMBER_TYPE_ATTRIBUTE,
  PLUS_PREFIX_ATTRIBUTE,
  REGION_FILTER_ATTRIBUTE,
  STRICT_ATTRIBUTE,
} from '../constants/attributes';
import type { TelixonPhoneFieldOptions } from '../models';

type Mode = TelixonPhoneFieldOptions['mode'];

type Filters = {
  regionFilter?: readonly RegionCode[];
  numberTypeFilter?: readonly NumberType[];
  placeholderNumberType?: NumberType;
};

type Rules = {
  strict?: boolean;
};

function invalid(attribute: string, value: string): TypeError {
  return new TypeError(`<${PHONE_FIELD_TAG}> does not accept ${attribute}="${value}".`);
}

/** The error for an attribute that only makes sense next to a default region. */
function needs(attribute: string): TypeError {
  return new TypeError(`<${PHONE_FIELD_TAG} ${attribute}> needs ${DEFAULT_REGION_ATTRIBUTE}.`);
}

function readMode(value: string | null): Mode {
  if (value === null || value === 'international') return 'international';
  if (value === 'national') return 'national';
  throw invalid(MODE_ATTRIBUTE, value);
}

function readRegion(attribute: string, value: string | null): RegionCode | null {
  if (value === null) return null;
  if (isRegionCode(value)) return value;
  throw invalid(attribute, value);
}

function readRegions(attribute: string, value: string | null): readonly RegionCode[] | null {
  const entries: readonly string[] = listAttribute(value);
  if (entries.length === 0) return null;
  return entries.map((entry: string): RegionCode => {
    if (isRegionCode(entry)) return entry;
    throw invalid(attribute, entry);
  });
}

function readNumberTypes(attribute: string, value: string | null): readonly NumberType[] | null {
  const entries: readonly string[] = listAttribute(value);
  if (entries.length === 0) return null;
  return entries.map((entry: string): NumberType => {
    if (isNumberType(entry)) return entry;
    throw invalid(attribute, entry);
  });
}

function readNumberType(attribute: string, value: string | null): NumberType | null {
  if (value === null) return null;
  if (isNumberType(value)) return value;
  throw invalid(attribute, value);
}

function readPlusPrefix(value: string | null): PlusPrefixMode | null {
  if (value === null) return null;
  if (isPlusPrefixMode(value)) return value;
  throw invalid(PLUS_PREFIX_ATTRIBUTE, value);
}

/** Whether the calling code stays in the input. Absent and `"true"` keep it there. */
function readCallingCodeInInput(value: string | null): boolean {
  if (value === null || value === TRUE_VALUE) return true;
  if (value === FALSE_VALUE) return false;
  throw invalid(CALLING_CODE_IN_INPUT_ATTRIBUTE, value);
}

function readFilters(host: Element): Filters {
  const regionFilter: readonly RegionCode[] | null = readRegions(
    REGION_FILTER_ATTRIBUTE,
    host.getAttribute(REGION_FILTER_ATTRIBUTE),
  );
  const numberTypeFilter: readonly NumberType[] | null = readNumberTypes(
    NUMBER_TYPE_FILTER_ATTRIBUTE,
    host.getAttribute(NUMBER_TYPE_FILTER_ATTRIBUTE),
  );
  const placeholderNumberType: NumberType | null = readNumberType(
    PLACEHOLDER_NUMBER_TYPE_ATTRIBUTE,
    host.getAttribute(PLACEHOLDER_NUMBER_TYPE_ATTRIBUTE),
  );
  return {
    ...(regionFilter === null ? {} : { regionFilter }),
    ...(numberTypeFilter === null ? {} : { numberTypeFilter }),
    ...(placeholderNumberType === null ? {} : { placeholderNumberType }),
  };
}

function readRules(host: Element): Rules {
  return host.hasAttribute(STRICT_ATTRIBUTE) ? { strict: true } : {};
}

/**
 * The options the element's attributes stand for. A value no option accepts throws, which surfaces
 * a typo in the markup at once.
 */
export function attributeOptions(host: Element): TelixonPhoneFieldOptions {
  const mode: Mode = readMode(host.getAttribute(MODE_ATTRIBUTE));
  const defaultRegion: RegionCode | null = readRegion(
    DEFAULT_REGION_ATTRIBUTE,
    host.getAttribute(DEFAULT_REGION_ATTRIBUTE),
  );
  const filters: Filters = readFilters(host);
  const rules: Rules = readRules(host);

  if (mode === 'national') {
    if (defaultRegion === null) throw needs(`${MODE_ATTRIBUTE}="national"`);
    return { mode, defaultRegion, ...rules, ...filters };
  }

  const callingCodeInInput: boolean = readCallingCodeInInput(host.getAttribute(CALLING_CODE_IN_INPUT_ATTRIBUTE));
  if (!callingCodeInInput) {
    if (defaultRegion === null) throw needs(`${CALLING_CODE_IN_INPUT_ATTRIBUTE}="${FALSE_VALUE}"`);
    return { mode, defaultRegion, display: { callingCodeInInput: false }, ...rules, ...filters };
  }

  const plusPrefix: PlusPrefixMode | null = readPlusPrefix(host.getAttribute(PLUS_PREFIX_ATTRIBUTE));
  return {
    mode,
    ...(defaultRegion === null ? {} : { defaultRegion }),
    ...(plusPrefix === null ? {} : { display: { callingCodeInInput: true, plusPrefix } }),
    ...rules,
    ...filters,
  };
}
