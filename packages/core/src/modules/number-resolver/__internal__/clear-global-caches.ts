import { __clearProfileCaches } from '../resolve-first-matching-number-type-profile';
import { __clearRegionCodeCache } from '../utils/resolve-region-code';

export function clearGlobalCaches(): void {
  __clearRegionCodeCache();
  __clearProfileCaches();
}
