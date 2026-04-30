import { getCountryIndex, PhoneNumberFormat } from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { getCallingCodeIndexByCountryIndex } from '@telixon/core/utils/get-calling-code-index-by-country-index';
import { NumberFormatRef } from '../modules/number-resolver/models';
import { ResourceProvider } from '../resource-provider/models';

export function getPhoneNumberFormat(formatRef: NumberFormatRef): PhoneNumberFormat {
  const resourceProvider: ResourceProvider = getResourceProvider();

  const callingCodeIndex: number = getCallingCodeIndexByCountryIndex(
    getCountryIndex(resourceProvider.countryScopeLayer, formatRef.stateCountryIndex),
  );

  return resourceProvider.formatsTable[callingCodeIndex]![formatRef.formatIndex]!;
}
