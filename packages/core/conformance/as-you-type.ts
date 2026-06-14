import { REGION_IDS, RegionId } from '@telixon/core';
import { CorpusEntry, Oracle } from '../oracle';
import { asYouTypeNationalWithTelixon, asYouTypeWithTelixon } from './subject';

export interface AsYouTypeDivergence {
  readonly input: string;
  readonly keystroke: number;
  readonly typed: string;
  readonly google: string;
  readonly telixon: string;
}

export interface AsYouTypeMeasurement {
  readonly totalNumbers: number;
  readonly fullyMatchingNumbers: number;
  // As fullyMatchingNumbers, ignoring our intentional trailing-separator preview (more aggressive than Google).
  readonly fullyMatchingIgnoringTrailing: number;
  readonly totalKeystrokes: number;
  readonly matchingKeystrokes: number;
  // As matchingKeystrokes, ignoring the trailing-separator preview: the real (non-intentional) delta.
  readonly matchingKeystrokesIgnoringTrailing: number;
  // Divergences that remain after ignoring the trailing-separator preview (the meaningful ones).
  readonly samples: readonly AsYouTypeDivergence[];
}

// One progressive comparison: what was typed, and the per-keystroke snapshots from each side.
export interface AsYouTypeCase {
  readonly input: string;
  readonly google: readonly string[];
  readonly telixon: readonly string[];
}

// Builds the per-keystroke case for one corpus number, or null to skip it.
export type AsYouTypeProbe = (oracle: Oracle, entry: CorpusEntry) => AsYouTypeCase | null;

function toRegionId(region: string): RegionId | null {
  return REGION_IDS.find((id) => id === region) ?? null;
}

// International: type the full E.164 (with '+') into the international controller and Google's formatter.
export const internationalProbe: AsYouTypeProbe = (oracle, entry) => ({
  input: entry.e164,
  google: oracle.asYouType(entry.regionCode, entry.e164),
  telixon: asYouTypeWithTelixon(entry.e164),
});

// National: type the national digits (national prefix + NSN) into the national controller and Google's formatter for the entry's region.
export const nationalProbe: AsYouTypeProbe = (oracle, entry) => {
  const country = toRegionId(entry.regionCode);
  if (!country) return null;
  const input = oracle.nationalInputDigits(entry.e164);
  if (!input) return null;
  return {
    input,
    google: oracle.asYouType(entry.regionCode, input),
    telixon: asYouTypeNationalWithTelixon(country, input),
  };
};

// Our controller previews the next group separator (e.g. "+376 712 "), Google does not; stripping trailing non-digits isolates that from real grouping divergences.
function stripTrailing(value: string): string {
  return value.replace(/\D+$/, '');
}

// Replays each corpus number char by char through both sides, comparing every keystroke. A measurement (not a gate): parity with Google both raw and ignoring the trailing-separator preview.
export function measureAsYouType(
  oracle: Oracle,
  corpus: readonly CorpusEntry[],
  probe: AsYouTypeProbe,
  sampleLimit = 25,
): AsYouTypeMeasurement {
  let totalNumbers = 0;
  let fullyMatchingNumbers = 0;
  let fullyMatchingIgnoringTrailing = 0;
  let totalKeystrokes = 0;
  let matchingKeystrokes = 0;
  let matchingKeystrokesIgnoringTrailing = 0;
  const samples: AsYouTypeDivergence[] = [];

  for (const entry of corpus) {
    const probed = probe(oracle, entry);
    if (!probed) continue;
    const { input, google, telixon } = probed;

    totalNumbers += 1;
    let fullyMatches = true;
    let fullyMatchesIgnoringTrailing = true;
    for (let keystroke = 0; keystroke < input.length; keystroke += 1) {
      const googleValue = google[keystroke] ?? '';
      const telixonValue = telixon[keystroke] ?? '';
      totalKeystrokes += 1;

      if (googleValue === telixonValue) matchingKeystrokes += 1;
      else fullyMatches = false;

      if (stripTrailing(googleValue) === stripTrailing(telixonValue)) {
        matchingKeystrokesIgnoringTrailing += 1;
      } else {
        fullyMatchesIgnoringTrailing = false;
        if (samples.length < sampleLimit) {
          samples.push({
            input,
            keystroke,
            typed: input.slice(0, keystroke + 1),
            google: googleValue,
            telixon: telixonValue,
          });
        }
      }
    }
    if (fullyMatches) fullyMatchingNumbers += 1;
    if (fullyMatchesIgnoringTrailing) fullyMatchingIgnoringTrailing += 1;
  }

  return {
    totalNumbers,
    fullyMatchingNumbers,
    fullyMatchingIgnoringTrailing,
    totalKeystrokes,
    matchingKeystrokes,
    matchingKeystrokesIgnoringTrailing,
    samples,
  };
}

function percent(part: number, whole: number): string {
  return whole === 0 ? '100.00%' : `${((part / whole) * 100).toFixed(2)}%`;
}

export function formatAsYouTypeMeasurement(label: string, measurement: AsYouTypeMeasurement): string {
  const {
    totalNumbers,
    fullyMatchingNumbers,
    fullyMatchingIgnoringTrailing,
    totalKeystrokes,
    matchingKeystrokes,
    matchingKeystrokesIgnoringTrailing,
    samples,
  } = measurement;
  const lines = [
    `${label} as-you-type vs Google AsYouTypeFormatter (per-keystroke)`,
    `  keystrokes matching (raw):              ${matchingKeystrokes}/${totalKeystrokes} (${percent(matchingKeystrokes, totalKeystrokes)})`,
    `  keystrokes matching (ignoring trailing): ${matchingKeystrokesIgnoringTrailing}/${totalKeystrokes} (${percent(matchingKeystrokesIgnoringTrailing, totalKeystrokes)})`,
    `  numbers fully matching (raw):           ${fullyMatchingNumbers}/${totalNumbers} (${percent(fullyMatchingNumbers, totalNumbers)})`,
    `  numbers fully matching (ignoring trailing): ${fullyMatchingIgnoringTrailing}/${totalNumbers} (${percent(fullyMatchingIgnoringTrailing, totalNumbers)})`,
  ];
  if (samples.length > 0) {
    lines.push(`  first ${samples.length} divergences beyond trailing preview (typed -> google | telixon):`);
    for (const sample of samples) {
      lines.push(
        `    ${sample.typed.padEnd(16)} -> ${JSON.stringify(sample.google)} | ${JSON.stringify(sample.telixon)}`,
      );
    }
  }
  return lines.join('\n');
}
