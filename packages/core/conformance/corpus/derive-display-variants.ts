import { REGION_IDS, RegionId } from '@telixon/core';
import { CorpusCase, RenderedExample } from './models';

const REGION_ID_BY_CODE: ReadonlyMap<string, RegionId> = new Map(REGION_IDS.map((regionId) => [regionId, regionId]));

// Every Google-rendered spelling a user could paste (international, national, RFC3966 URI, padded E.164); each must resolve exactly like the canonical E.164 on both sides.
export function deriveDisplayVariants(renderedExamples: readonly RenderedExample[]): CorpusCase[] {
  const variants: CorpusCase[] = [];

  for (const { example, rendered } of renderedExamples) {
    const { regionCode, e164 } = example;

    if (rendered.formatInternational) {
      variants.push({
        family: 'display-variant',
        kind: 'international-display',
        input: rendered.formatInternational,
        regionCode,
        sourceE164: e164,
      });
    }

    const defaultCountry = REGION_ID_BY_CODE.get(regionCode);
    if (rendered.formatNational && defaultCountry) {
      variants.push({
        family: 'display-variant',
        kind: 'national-display',
        input: rendered.formatNational,
        defaultCountry,
        regionCode,
        sourceE164: e164,
      });
    }

    if (rendered.formatRfc3966) {
      variants.push({
        family: 'display-variant',
        kind: 'rfc3966-uri',
        input: rendered.formatRfc3966,
        regionCode,
        sourceE164: e164,
      });
    }

    variants.push({
      family: 'display-variant',
      kind: 'whitespace-padded',
      input: ` \t${e164} `,
      regionCode,
      sourceE164: e164,
    });
  }

  return variants;
}
