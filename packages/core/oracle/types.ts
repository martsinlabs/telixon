import { NumberType } from '@telixon/core';

// Types we sample one Google example per region for (UNKNOWN has no examples; FIXED_LINE_OR_MOBILE only echoes a fixed-line/mobile example, so neither is sampled).
export interface SampledType {
  readonly name: NumberType;
  readonly id: number;
}

// One sampled number: a Google example for a region and type, in E.164 form.
export interface CorpusEntry {
  readonly regionCode: string;
  readonly sampledType: NumberType;
  readonly e164: string;
}

// Per-number outcome for every compared method, from either side.
export interface MethodResults {
  readonly isValid: boolean;
  readonly isPossible: boolean;
  readonly isPossibleWithReason: string;
  readonly getNumberType: NumberType;
  readonly getNationalNumber: string;
  readonly getCallingCode: string | null;
  readonly getExtension: string | null;
  readonly getRegion: string | null;
  readonly formatE164: string | null;
  readonly formatNational: string | null;
  readonly formatInternational: string | null;
  readonly formatRfc3966: string | null;
}

export interface Oracle {
  // The google/libphonenumber commit the oracle is loaded at (identical to the engine's commit).
  readonly commit: string;
  readonly sampledTypes: readonly SampledType[];
  supportedRegions(): readonly string[];
  // Google's example number for a region and type as E.164, or null when none exists.
  sampleExampleE164(regionCode: string, typeId: number): string | null;
  // The oracle's verdict for every compared method, or null when Google rejects the input; `regionCode` reads national form (no '+'), like Telixon's defaultRegion.
  evaluate(input: string, regionCode?: string): MethodResults | null;
  // Google's country calling code for a region, as a string ('0' for an unknown region).
  countryCallingCode(regionCode: string): string;
  // The subset of `candidates` Google judges the number valid for (isValidNumberForRegion), joined
  // by ',' in candidate order, or null when Google rejects the input at parse.
  validForRegions(input: string, regionCode: string | undefined, candidates: readonly string[]): string | null;
  // Google's AsYouTypeFormatter snapshot after each input character of `input` (one entry per character).
  asYouType(regionCode: string, input: string): readonly string[];
  // The national-format digits a user types for `e164` (national prefix + NSN), or null if unparseable.
  nationalInputDigits(e164: string): string | null;
}
