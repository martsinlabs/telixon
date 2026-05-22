import { CountryId, getCallingCodeStateCountries, TerritorySpec } from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { fullPattern } from './full-pattern';
import { matchesLeadingDigits } from './matches-leading-digits';

const GENERAL_DESC = 'GENERAL_DESC';

// libphonenumber getRegionCodeForNumberFromRegionList: a non-main region matches by its leadingDigits
// prefix; the main region (no leadingDigits) matches when a specific type pattern fully matches.
// GENERAL_DESC is excluded — its pattern is broad and would attribute foreign numbers to the main region.
function matchesRegion(territory: TerritorySpec, nationalDigits: string): boolean {
  if (territory.leadingDigits) {
    return matchesLeadingDigits(territory.leadingDigits, nationalDigits);
  }

  const { refMapping } = getResourceProvider();
  for (const numberType of territory.numberTypes) {
    if (refMapping.numberTypes[numberType.type] === GENERAL_DESC) continue;
    if (fullPattern(numberType.nationalNumberPattern).test(nationalDigits)) return true;
  }
  return false;
}

// libphonenumber getRegionCodeForNumber: the first region in the calling code's main-first order that
// the number matches, or null. Shared by getCountry and the input controller so they always agree.
export function resolveRegionCode(callingCodeState: number, nationalDigits: string): CountryId | null {
  if (callingCodeState === -1) return null;

  const { refMapping, callingCodeLayer, territorySpecTable } = getResourceProvider();
  const regions: Uint8Array = getCallingCodeStateCountries(callingCodeLayer, callingCodeState);
  if (regions.length === 1) return refMapping.countries.indexToKey[regions[0]!] ?? null;

  for (const countryIndex of regions) {
    const territory: TerritorySpec | undefined = territorySpecTable[countryIndex];
    if (territory && matchesRegion(territory, nationalDigits)) {
      return refMapping.countries.indexToKey[countryIndex] ?? null;
    }
  }
  return null;
}
