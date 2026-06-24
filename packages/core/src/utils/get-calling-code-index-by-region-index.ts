import { getResourceProvider } from '../resource-provider';

export function getCallingCodeIndexByRegionIndex(regionIndex: number): number {
  return getResourceProvider().callingCodeIndexByRegion[regionIndex] ?? -1;
}
