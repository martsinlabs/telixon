import { REGION_CODES, RegionCode } from '@telixon/core';
import { CorpusCase, RenderedExample } from './models';

const REGION_ID_BY_CODE: ReadonlyMap<string, RegionCode> = new Map(
  REGION_CODES.map((regionId) => [regionId, regionId]),
);

// One deterministic extension for every derived spelling.
const EXTENSION_DIGITS = '22';

// The extension spellings of every example: an explicit label on the international rendering, an
// ambiguous label on the national rendering, and the RFC 3966 parameter on the E.164 form. Each
// must parse on both sides with the extension captured and every method agreeing.
export function deriveExtensionVariants(renderedExamples: readonly RenderedExample[]): CorpusCase[] {
  const variants: CorpusCase[] = [];

  for (const { example, rendered } of renderedExamples) {
    const { regionCode, e164 } = example;

    if (rendered.formatInternational) {
      variants.push({
        family: 'display-variant',
        kind: 'extension-explicit-label',
        input: `${rendered.formatInternational} ext. ${EXTENSION_DIGITS}`,
        regionCode,
        sourceE164: e164,
      });
    }

    const defaultRegion = REGION_ID_BY_CODE.get(regionCode);
    if (rendered.formatNational && defaultRegion) {
      variants.push({
        family: 'display-variant',
        kind: 'extension-ambiguous-label',
        input: `${rendered.formatNational} x${EXTENSION_DIGITS}`,
        defaultRegion,
        regionCode,
        sourceE164: e164,
      });
    }

    variants.push({
      family: 'display-variant',
      kind: 'extension-rfc3966',
      input: `${e164};ext=${EXTENSION_DIGITS}`,
      regionCode,
      sourceE164: e164,
    });
  }

  return variants;
}
