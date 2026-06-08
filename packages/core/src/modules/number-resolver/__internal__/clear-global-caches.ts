import { __clearProfileCaches } from '../resolve-first-matching-number-type-profile';
import { __clearFullPatternCache } from '../utils/full-pattern';
import { __clearPrefixMatcherCache } from '../utils/matches-leading-digits';
import { __clearRegionCodeCache } from '../utils/resolve-region-code';
import { __clearFormatIndexCache } from '../utils/select-international-format';

export function clearGlobalCaches(): void {
  __clearRegionCodeCache();
  __clearFormatIndexCache();
  __clearProfileCaches();
  __clearFullPatternCache();
  __clearPrefixMatcherCache();
}
