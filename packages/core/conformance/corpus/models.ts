import { RegionId } from '@telixon/core';
import { CorpusEntry, MethodResults } from '../../oracle';

// The family decides the comparison contract: 'example'/'display-variant' must parse on both sides; 'mutation' may be Google-rejected, and Telixon must then judge it not possible.
export type CorpusCaseFamily = 'example' | 'display-variant' | 'mutation';

export type CorpusCaseKind =
  // family 'example': a Google example number, canonical E.164.
  | 'example'
  // family 'display-variant': the same number in another spelling a user could paste.
  | 'international-display'
  | 'national-display'
  | 'rfc3966-uri'
  | 'whitespace-padded'
  // family 'mutation': a deterministic corruption of the example.
  | 'truncated'
  | 'extended'
  | 'first-national-digit-mutated'
  | 'unassigned-calling-code';

// One conformance case: an exact input string both sides parse under identical conditions.
export interface CorpusCase {
  readonly family: CorpusCaseFamily;
  readonly kind: CorpusCaseKind;
  // The exact string both sides parse.
  readonly input: string;
  // Region both sides parse with, for inputs written in national form.
  readonly defaultCountry?: RegionId;
  // Region the case derives from; 'ZZ' when the case is not tied to one. Display-only provenance.
  readonly regionCode: string;
  // The Google example the case was derived from; null for standalone cases.
  readonly sourceE164: string | null;
}

// An example together with Google's rendering of it: the shared base every derivation starts from.
export interface RenderedExample {
  readonly example: CorpusEntry;
  readonly rendered: MethodResults;
}
