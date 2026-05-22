import { ConformanceReport, MethodReport } from './models';

const NAME_WIDTH = 22;
const MAX_SHOWN_PER_METHOD = 25;

function percent(rate: number): string {
  return `${(rate * 100).toFixed(2)}%`;
}

function formatMethodLines(method: MethodReport): string[] {
  const summary = `  ${method.method.padEnd(NAME_WIDTH)}${percent(method.matchRate).padStart(7)}  (${method.matched}/${method.total})`;
  const shown = method.mismatches
    .slice(0, MAX_SHOWN_PER_METHOD)
    .map(
      (mismatch) =>
        `      ${mismatch.regionCode} ${mismatch.e164}  expected=${mismatch.expected}  actual=${mismatch.actual}`,
    );
  const overflow = method.mismatches.length - MAX_SHOWN_PER_METHOD;
  if (overflow > 0) shown.push(`      … and ${overflow} more`);
  return [summary, ...shown];
}

// Renders a ConformanceReport as readable text: a header with coverage, then one line per method.
export function formatConformanceReport(report: ConformanceReport): string {
  return [
    'Telixon conformance vs Google libphonenumber',
    `oracle and engine pinned to google/libphonenumber@${report.commit.slice(0, 7)} · no metadata drift`,
    `${report.corpusSize} numbers · ${report.regionsCovered}/${report.regionsTotal} regions · ${report.skipped} skipped`,
    '',
    ...report.methods.flatMap(formatMethodLines),
  ].join('\n');
}
