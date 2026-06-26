import { __clearIddMatcherCache } from '../resolve-number';
import { __clearFormatMaskCaches } from '../utils/format-masks';
import { __clearNationalPrefixRulesCache } from '../utils/get-national-prefix-rules';

// Clears module-level memos derived from the artifact, so the bench's strict-cold scenarios measure true one-shot cost.
export function clearGlobalCaches(): void {
  __clearFormatMaskCaches();
  __clearNationalPrefixRulesCache();
  __clearIddMatcherCache();
}
