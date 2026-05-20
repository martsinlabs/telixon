import {
  containsLength,
  forEachNumberTypeIndex,
  getCountryIndex,
  getLengthMask,
  getNumberTypeMask,
  getNumberTypeProfileId,
  getTerminalPrefixNumberTypeMask,
  MetadataNumberType,
  NumberType,
  toNumberTypes,
} from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { isNumberTypeAllowed } from '../../number-resolver/utils/is-number-type-allowed';
import { ResolvedPhoneNumber } from '../models';

// Collapses every allowed number type matching the resolved terminal at the typed
// length into one public NumberType (toNumberTypes folds FIXED_LINE + MOBILE).
export function getNumberType(resolved: ResolvedPhoneNumber): NumberType | null {
  const { profileRef, nationalDigits, numberTypeFilter } = resolved;
  if (!profileRef) return null;

  const resourceProvider = getResourceProvider();
  const scope = resourceProvider.numberTypeScopeLayer;
  const profileLayer = resourceProvider.numberTypeProfileLayer;
  const { stateCountryIndex } = profileRef;

  const countryIndex: number = getCountryIndex(resourceProvider.countryScopeLayer, stateCountryIndex);
  const territory = resourceProvider.territorySpecTable[countryIndex];
  if (!territory) return null;

  const numberTypeMask: number = getNumberTypeMask(scope, stateCountryIndex);
  const candidateMask: number = getTerminalPrefixNumberTypeMask(scope, stateCountryIndex);
  const length: number = nationalDigits.length;

  const matched: MetadataNumberType[] = [];

  forEachNumberTypeIndex(candidateMask, (numberTypeIndex: number) => {
    if (numberTypeFilter && !isNumberTypeAllowed(numberTypeFilter, countryIndex, numberTypeIndex)) return;

    const profileId: number = getNumberTypeProfileId(profileLayer, stateCountryIndex, numberTypeMask, numberTypeIndex);
    if (!containsLength(getLengthMask(profileLayer, profileId), length)) return;

    const typeId: number = territory.numberTypes[numberTypeIndex]!.type;
    matched.push(resourceProvider.refMapping.numberTypes[typeId]!);
  });

  const [type] = toNumberTypes(matched);
  return type && type !== 'UNKNOWN' ? type : null;
}
