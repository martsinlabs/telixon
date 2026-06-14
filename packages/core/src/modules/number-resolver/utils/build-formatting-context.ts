import { PhoneNumberFormattingContext } from '@telixon/core/engine';
import { MetadataPlaceholders } from '@telixon/core/resource-provider/models';

// Assembles the engine formatting context from a display mask and the load-time placeholders.
export function buildFormattingContext(
  mask: string,
  nationalNumber: string,
  placeholders: MetadataPlaceholders,
  nationalPrefix?: string,
): PhoneNumberFormattingContext {
  const context: PhoneNumberFormattingContext = {
    mask,
    nationalNumber,
    digitPlaceholder: placeholders.digitPlaceholder,
    nationalPrefixPlaceholder: placeholders.nationalPrefixPlaceholder,
    ignoredDigitPlaceholder: placeholders.ignoredDigitPlaceholder,
  };
  if (nationalPrefix !== undefined) context.nationalPrefix = nationalPrefix;
  return context;
}
