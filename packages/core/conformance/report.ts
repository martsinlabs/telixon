import { ConformanceReport, MethodReport, Mismatch } from './models';
import { PrefixSweepReport } from './prefix-sweep';
import { ValidForRegionSweep } from './valid-for-region';

const NAME_WIDTH = 22;
const MAX_SHOWN_PER_METHOD = 25;

function percent(rate: number): string {
  return `${(rate * 100).toFixed(2)}%`;
}

function formatMismatchLine(mismatch: Mismatch): string {
  return `      ${mismatch.kind} ${mismatch.regionCode} ${JSON.stringify(mismatch.input)}  expected=${mismatch.expected}  actual=${mismatch.actual}`;
}

function formatMismatchLines(mismatches: readonly Mismatch[]): string[] {
  const shown = mismatches.slice(0, MAX_SHOWN_PER_METHOD).map(formatMismatchLine);
  const overflow = mismatches.length - MAX_SHOWN_PER_METHOD;
  if (overflow > 0) shown.push(`      … and ${overflow} more`);
  return shown;
}

function formatMethodLines(method: MethodReport): string[] {
  const summary = `  ${method.method.padEnd(NAME_WIDTH)}${percent(method.matchRate).padStart(7)}  (${method.matched}/${method.total})`;
  return [summary, ...formatMismatchLines(method.mismatches)];
}

function formatComposition(report: ConformanceReport): string {
  return report.composition.map(({ kind, cases }) => `${kind}=${cases}`).join(' · ');
}

// Renders a ConformanceReport as readable text: coverage and corpus composition, the Google-rejected agreement line, then one line per method.
export function formatConformanceReport(report: ConformanceReport): string {
  const { rejection } = report;
  return [
    'Telixon conformance vs Google libphonenumber',
    `oracle and engine pinned to google/libphonenumber@${report.commit.slice(0, 7)} · no metadata drift`,
    `${report.corpusSize} cases · ${report.compared} compared · ${report.regionsCovered}/${report.regionsTotal} regions · ${report.skipped} skipped`,
    `  ${formatComposition(report)}`,
    `  google-rejected mutations judged not possible: ${rejection.agreed}/${rejection.total}`,
    ...formatMismatchLines(rejection.mismatches),
    '',
    ...report.methods.flatMap(formatMethodLines),
  ].join('\n');
}

// Renders one valid-for-region sweep: set parity on parseable inputs, valid-for-none agreement on the rest.
export function formatValidForRegionReport(title: string, sweep: ValidForRegionSweep): string {
  return [
    `isValidForRegion vs Google isValidNumberForRegion (${title})`,
    `  ${sweep.total} inputs · ${sweep.regionChecks} (input, region) checks`,
    `  valid-region sets matching:             ${sweep.matched}/${sweep.compared} (${percent(sweep.compared === 0 ? 1 : sweep.matched / sweep.compared)})`,
    `  google-rejected judged valid nowhere:   ${sweep.rejectionAgreed}/${sweep.rejectedByGoogle}`,
    ...formatMismatchLines(sweep.mismatches),
  ].join('\n');
}

// Renders the per-prefix possibility sweep: reason parity on parseable prefixes, rejection agreement on the rest.
export function formatPrefixSweepReport(sweep: PrefixSweepReport): string {
  return [
    'Possibility prefix sweep vs Google (per digit prefix)',
    `  ${sweep.totalPrefixes} distinct prefixes`,
    `  reasons matching:                       ${sweep.matched}/${sweep.compared} (${percent(sweep.compared === 0 ? 1 : sweep.matched / sweep.compared)})`,
    `  google-rejected judged not possible:    ${sweep.rejectionAgreed}/${sweep.rejectedByGoogle}`,
    ...formatMismatchLines(sweep.mismatches),
  ].join('\n');
}
