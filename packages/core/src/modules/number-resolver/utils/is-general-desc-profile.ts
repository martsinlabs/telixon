import { getCountryIndex, MetadataNumberType } from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { NumberTypeProfileRef } from '../models';

const GENERAL_DESC_LABEL: MetadataNumberType = 'GENERAL_DESC';

export function isGeneralDescProfile(profile: NumberTypeProfileRef): boolean {
  const resourceProvider = getResourceProvider();
  const countryIndex: number = getCountryIndex(resourceProvider.countryScopeLayer, profile.stateCountryIndex);
  const typeId: number = resourceProvider.territorySpecTable[countryIndex]!.numberTypes[profile.numberTypeIndex]!.type;
  return resourceProvider.refMapping.numberTypes[typeId] === GENERAL_DESC_LABEL;
}
