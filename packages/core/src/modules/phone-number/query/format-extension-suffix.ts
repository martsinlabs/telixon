import { getRegionPreferredExtnPrefix } from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { resolvePrimaryRegionIndex } from '../../number-resolver/utils/resolve-primary-region-index';
import { ResolvedPhoneNumber } from '../models';

// libphonenumber DEFAULT_EXTN_PREFIX_: the rendering when the territory metadata names none.
const DEFAULT_EXTENSION_PREFIX = ' ext. ';

// Appends the captured extension the way the territory writes it, mirroring libphonenumber's
// maybeGetFormattedExtension: the prefix comes from the calling code's main region.
export function appendExtensionSuffix(formatted: string, resolved: ResolvedPhoneNumber): string {
  if (resolved.extension === null) return formatted;

  const regionIndex: number = resolvePrimaryRegionIndex(resolved.callingCodeState, resolved.defaultRegionIndex);
  const preferredPrefix: string | undefined =
    regionIndex >= 0 ? getRegionPreferredExtnPrefix(getResourceProvider().engine, regionIndex) : undefined;

  return formatted + (preferredPrefix ?? DEFAULT_EXTENSION_PREFIX) + resolved.extension;
}
