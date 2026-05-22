import {
  containsLength,
  forEachNumberTypeIndex,
  forEachStateRegionWithTerminalPrefix,
  getLengthMask,
  getNumberTypeMask,
  getNumberTypeProfileId,
  getRegionIndex,
  getTerminalPrefixNumberTypeMask,
  MetadataNumberType,
  NumberType,
} from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { isNumberTypeAllowed } from '../../number-resolver/utils/is-number-type-allowed';
import { ResolvedPhoneNumber } from '../models';

// One type from the matched set, in libphonenumber priority order (getNumberTypeHelper).
function selectNumberType(matched: readonly MetadataNumberType[]): Exclude<NumberType, 'UNKNOWN'> | null {
  if (matched.includes('PREMIUM_RATE')) return 'PREMIUM_RATE';
  if (matched.includes('TOLL_FREE')) return 'TOLL_FREE';
  if (matched.includes('SHARED_COST')) return 'SHARED_COST';
  if (matched.includes('VOIP')) return 'VOIP';
  if (matched.includes('PERSONAL_NUMBER')) return 'PERSONAL_NUMBER';
  if (matched.includes('PAGER')) return 'PAGER';
  if (matched.includes('UAN')) return 'UAN';
  if (matched.includes('VOICEMAIL')) return 'VOICEMAIL';

  const fixed: boolean = matched.includes('FIXED_LINE');
  const mobile: boolean = matched.includes('MOBILE');
  if (fixed && mobile) return 'FIXED_LINE_OR_MOBILE';
  if (fixed) return 'FIXED_LINE';
  if (mobile) return 'MOBILE';

  return null;
}

// Unions every type matching the full number across all terminal states of the resolved country:
// one number can match FIXED_LINE in one terminal state and MOBILE in another.
export function getNumberType(resolved: ResolvedPhoneNumber): Exclude<NumberType, 'UNKNOWN'> | null {
  const { profileRef, nationalDigits, numberTypeFilter, terminalStates } = resolved;
  if (!profileRef) return null;

  const resourceProvider = getResourceProvider();
  const scope = resourceProvider.numberTypeScopeLayer;
  const profileLayer = resourceProvider.numberTypeProfileLayer;
  const countryScopeLayer = resourceProvider.countryScopeLayer;

  const countryIndex: number = getRegionIndex(countryScopeLayer, profileRef.stateCountryIndex);
  const territory = resourceProvider.territorySpecTable[countryIndex];
  if (!territory) return null;

  const length: number = nationalDigits.length;
  const matched: MetadataNumberType[] = [];
  let seenTypeIds = 0;

  for (const terminalState of terminalStates) {
    forEachStateRegionWithTerminalPrefix(countryScopeLayer, terminalState, (stateCountryIndex, stateCountry) => {
      if (stateCountry !== countryIndex) return;

      const numberTypeMask: number = getNumberTypeMask(scope, stateCountryIndex);
      const candidateMask: number = getTerminalPrefixNumberTypeMask(scope, stateCountryIndex);

      forEachNumberTypeIndex(candidateMask, (numberTypeIndex: number) => {
        if (numberTypeFilter && !isNumberTypeAllowed(numberTypeFilter, countryIndex, numberTypeIndex)) return;

        const profileId: number = getNumberTypeProfileId(
          profileLayer,
          stateCountryIndex,
          numberTypeMask,
          numberTypeIndex,
        );
        if (!containsLength(getLengthMask(profileLayer, profileId), length)) return;

        const typeId: number = territory.numberTypes[numberTypeIndex]!.type;
        const typeBit: number = 1 << typeId;
        if (seenTypeIds & typeBit) return;
        seenTypeIds |= typeBit;

        matched.push(resourceProvider.refMapping.numberTypes[typeId]!);
      });
    });
  }

  return selectNumberType(matched);
}
