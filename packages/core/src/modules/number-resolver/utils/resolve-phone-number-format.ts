import { getRegionIndex, PhoneNumberFormat } from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { ResourceProvider } from '@telixon/core/resource-provider/models';
import { getCallingCodeIndexByCountryIndex } from '@telixon/core/utils/get-calling-code-index-by-country-index';
import { NumberFormatRef } from '../models';

export function resolvePhoneNumberFormat(formatRef: NumberFormatRef): PhoneNumberFormat {
  const resourceProvider: ResourceProvider = getResourceProvider();

  const callingCodeIndex: number = getCallingCodeIndexByCountryIndex(
    getRegionIndex(resourceProvider.countryScopeLayer, formatRef.stateCountryIndex),
  );

  return resourceProvider.formatsTable[callingCodeIndex]![formatRef.formatIndex]!;
}
