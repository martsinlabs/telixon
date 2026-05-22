import { PhoneNumberFormattingContext, ReferenceMapping } from '@telixon/core/engine';

// Assembles the engine formatting context from a display mask and the reference-mapping placeholders.
export function buildFormattingContext(
  mask: string,
  nationalNumber: string,
  refMapping: ReferenceMapping,
  nationalPrefix?: string,
): PhoneNumberFormattingContext {
  return {
    mask,
    nationalNumber,
    digitPlaceholder: refMapping.digitPlaceholder,
    nationalPrefixPlaceholder: refMapping.nationalPrefixPlaceholder,
    ignoredDigitPlaceholder: refMapping.ignoredDigitPlaceholder,
    ...(nationalPrefix !== undefined && { nationalPrefix }),
  };
}
