import { getResourceProvider } from '@telixon/core/resource-provider';
import { requireEngineReady } from '@telixon/core/utils/require-engine-ready';
import { ResolvedNumberState, resolveNumber } from '../number-resolver/resolve-number';
import { createPhoneNumber, PhoneNumber, toResolvedPhoneNumber } from '../phone-number';
import { ParsePhoneNumberOptions } from './models';

function isWhitespace(charCode: number): boolean {
  return charCode === 0x20 || charCode === 0x09 || charCode === 0x0a || charCode === 0x0d;
}

// Parses a number into a PhoneNumber (no controller): '+' is international, else national via defaultRegion.
// Detects the leading-plus flag, then defers to the shared resolveNumber pipeline (which ignores non-digits).
export function parsePhoneNumber(input: string, options: ParsePhoneNumberOptions = {}): PhoneNumber {
  requireEngineReady();

  const resourceProvider = getResourceProvider();
  const defaultRegionIndex: number =
    options.defaultRegion !== undefined ? (resourceProvider.regionKeyToIndex[options.defaultRegion] ?? -1) : -1;

  let index = 0;
  while (index < input.length && isWhitespace(input.charCodeAt(index))) index++;
  const hasLeadingPlus: boolean = index < input.length && input.charCodeAt(index) === 0x2b;

  const resolved: ResolvedNumberState = resolveNumber({
    input,
    hasLeadingPlus,
    defaultRegionIndex,
    regionFilter: null,
    numberTypeFilter: null,
    strict: options.strict ?? false,
  });

  return createPhoneNumber(
    toResolvedPhoneNumber(
      resolved.snapshot,
      defaultRegionIndex,
      resolved.nationalPrefixPresent,
      resolved.readAsNational,
    ),
  );
}
