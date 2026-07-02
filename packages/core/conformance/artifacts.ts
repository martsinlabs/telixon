import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { DivergenceAudit } from './known-divergences';
import { ConformanceReport } from './models';
import { PrefixSweepReport } from './prefix-sweep';
import { ValidForRegionSweep } from './valid-for-region';

// ── Types ────────────────────────────────────────────────

interface ParityMethod {
  readonly method: string;
  readonly total: number;
  readonly matched: number;
  readonly matchRate: number;
}

interface ParityKind {
  readonly kind: string;
  readonly cases: number;
}

interface ParityCorpus {
  readonly size: number;
  readonly compared: number;
  readonly skipped: number;
  readonly regionsCovered: number;
  readonly regionsTotal: number;
  readonly byKind: readonly ParityKind[];
}

interface ParityRejection {
  readonly total: number;
  readonly agreed: number;
}

interface ParityPrefixSweep {
  readonly totalPrefixes: number;
  readonly compared: number;
  readonly matched: number;
  readonly rejectedByGoogle: number;
  readonly rejectionAgreed: number;
}

interface ParityValidForRegionSweep {
  readonly total: number;
  readonly compared: number;
  readonly matched: number;
  readonly rejectedByGoogle: number;
  readonly rejectionAgreed: number;
  readonly regionChecks: number;
}

interface ParityValidForRegion {
  readonly corpus: ParityValidForRegionSweep;
  readonly caseCoverage: ParityValidForRegionSweep;
}

interface ParityOverall {
  readonly matched: number;
  readonly total: number;
  readonly matchRate: number;
}

interface ParityAllowlist {
  readonly unexpected: number;
  readonly stale: number;
}

interface ParityData {
  readonly runAt: string;
  readonly commit: string;
  readonly corpus: ParityCorpus;
  readonly overall: ParityOverall;
  readonly methods: readonly ParityMethod[];
  readonly rejection: ParityRejection;
  readonly prefixSweep: ParityPrefixSweep;
  readonly validForRegion: ParityValidForRegion;
  readonly allowlist: ParityAllowlist;
}

interface ShieldsBadge {
  readonly schemaVersion: 1;
  readonly label: string;
  readonly message: string;
  readonly color: string;
}

// ── Paths and template ───────────────────────────────────

// Resolved against process.cwd() so the output location is identical in local runs and CI (`pnpm conformance` always runs from the repo root).
const CONFORMANCE_DIR = resolve('packages/core/conformance');
const ARTIFACT_DIR = join(CONFORMANCE_DIR, 'dist');
const TEMPLATE = readFileSync(join(CONFORMANCE_DIR, 'parity.template.html'), 'utf8');

const METHOD_ROW_INDENT = '\n        ';

// ── Public entry (I/O boundary) ──────────────────────────

// Writes parity.json, parity-badge.json, parity.html into conformance/dist/; runs even if assertions fail so the dashboard always reflects current state.
export function exportArtifacts(
  report: ConformanceReport,
  sweep: PrefixSweepReport,
  audit: DivergenceAudit,
  validForRegion: ValidForRegionSweep,
  validForRegionCases: ValidForRegionSweep,
): void {
  const data = buildParityData(report, sweep, audit, validForRegion, validForRegionCases);
  mkdirSync(ARTIFACT_DIR, { recursive: true });
  writeFileSync(join(ARTIFACT_DIR, 'parity.json'), JSON.stringify(data, null, 2));
  writeFileSync(join(ARTIFACT_DIR, 'parity-badge.json'), JSON.stringify(buildBadge(data), null, 2));
  writeFileSync(join(ARTIFACT_DIR, 'parity.html'), renderHtml(data));
}

// ── Pure builders ────────────────────────────────────────

function toParitySweep(sweep: ValidForRegionSweep): ParityValidForRegionSweep {
  return {
    total: sweep.total,
    compared: sweep.compared,
    matched: sweep.matched,
    rejectedByGoogle: sweep.rejectedByGoogle,
    rejectionAgreed: sweep.rejectionAgreed,
    regionChecks: sweep.regionChecks,
  };
}

function buildParityData(
  report: ConformanceReport,
  sweep: PrefixSweepReport,
  audit: DivergenceAudit,
  validForRegion: ValidForRegionSweep,
  validForRegionCases: ValidForRegionSweep,
): ParityData {
  // The methods table stays in corpus terms (one denominator across rows); the exhaustive case sweep renders as its own line.
  const validForRegionRow: ParityMethod = {
    method: 'isValidForRegion',
    total: validForRegion.compared,
    matched: validForRegion.matched,
    matchRate: validForRegion.compared === 0 ? 1 : validForRegion.matched / validForRegion.compared,
  };
  return {
    runAt: new Date().toISOString(),
    commit: report.commit,
    corpus: {
      size: report.corpusSize,
      compared: report.compared,
      skipped: report.skipped,
      regionsCovered: report.regionsCovered,
      regionsTotal: report.regionsTotal,
      byKind: report.composition.map(({ kind, cases }) => ({ kind, cases })),
    },
    overall: sumOverall(report, sweep, validForRegion, validForRegionCases),
    methods: [
      ...report.methods.map((m) => ({
        method: m.method,
        total: m.total,
        matched: m.matched,
        matchRate: m.matchRate,
      })),
      validForRegionRow,
    ],
    rejection: { total: report.rejection.total, agreed: report.rejection.agreed },
    prefixSweep: {
      totalPrefixes: sweep.totalPrefixes,
      compared: sweep.compared,
      matched: sweep.matched,
      rejectedByGoogle: sweep.rejectedByGoogle,
      rejectionAgreed: sweep.rejectionAgreed,
    },
    validForRegion: {
      corpus: toParitySweep(validForRegion),
      caseCoverage: toParitySweep(validForRegionCases),
    },
    allowlist: { unexpected: audit.unexpected.length, stale: audit.stale.length },
  };
}

// One headline number across every gated comparison: method checks, Google-rejected agreements, the per-prefix possibility sweep, and both valid-for-region sweeps.
function sumOverall(
  report: ConformanceReport,
  sweep: PrefixSweepReport,
  validForRegion: ValidForRegionSweep,
  validForRegionCases: ValidForRegionSweep,
): ParityOverall {
  const methodTotals = report.methods.reduce(
    (acc, m) => ({ matched: acc.matched + m.matched, total: acc.total + m.total }),
    { matched: 0, total: 0 },
  );
  const matched =
    methodTotals.matched +
    report.rejection.agreed +
    sweep.matched +
    sweep.rejectionAgreed +
    validForRegion.matched +
    validForRegion.rejectionAgreed +
    validForRegionCases.matched +
    validForRegionCases.rejectionAgreed;
  const total =
    methodTotals.total +
    report.rejection.total +
    sweep.compared +
    sweep.rejectedByGoogle +
    validForRegion.compared +
    validForRegion.rejectedByGoogle +
    validForRegionCases.compared +
    validForRegionCases.rejectedByGoogle;
  return { matched, total, matchRate: total === 0 ? 1 : matched / total };
}

function buildBadge(data: ParityData): ShieldsBadge {
  const passing = data.overall.matchRate === 1 && data.allowlist.unexpected === 0 && data.allowlist.stale === 0;
  // Floor so 99.99% never reads as 100%; exact 100 only when matchRate === 1.
  const percent = Math.floor(data.overall.matchRate * 100);
  return {
    schemaVersion: 1,
    label: 'conformance',
    message: `${percent}%`,
    color: passing ? 'brightgreen' : data.overall.matchRate > 0.99 ? 'yellow' : 'red',
  };
}

// ── HTML rendering ───────────────────────────────────────

function renderHtml(data: ParityData): string {
  const tokens: Record<string, string> = {
    '{{commit}}': data.commit,
    '{{shortCommit}}': data.commit.slice(0, 7),
    '{{corpusSize}}': String(data.corpus.size),
    '{{compared}}': String(data.corpus.compared),
    '{{regionsCovered}}': String(data.corpus.regionsCovered),
    '{{regionsTotal}}': String(data.corpus.regionsTotal),
    '{{skipped}}': String(data.corpus.skipped),
    '{{corpusByKind}}': renderCorpusByKind(data.corpus.byKind),
    '{{rejection}}': `${data.rejection.agreed}/${data.rejection.total}`,
    '{{prefixSweep}}': renderPrefixSweep(data.prefixSweep),
    '{{validForRegionCases}}': renderValidForRegionSweep(data.validForRegion.caseCoverage),
    '{{allowlist}}': renderAllowlist(data.allowlist),
    '{{runAt}}': data.runAt,
    '{{methodRows}}': data.methods.map(renderMethodRow).join(METHOD_ROW_INDENT),
  };
  return Object.entries(tokens).reduce((html, [token, value]) => html.split(token).join(value), TEMPLATE);
}

function renderCorpusByKind(byKind: readonly ParityKind[]): string {
  return byKind.map(({ kind, cases }) => `${kind}&nbsp;${cases}`).join(' · ');
}

function renderPrefixSweep(sweep: ParityPrefixSweep): string {
  const rate = sweep.compared === 0 ? 1 : sweep.matched / sweep.compared;
  return `${(rate * 100).toFixed(2)}% (${sweep.matched}/${sweep.compared}) · google-rejected agreed ${sweep.rejectionAgreed}/${sweep.rejectedByGoogle}`;
}

function renderValidForRegionSweep(sweep: ParityValidForRegionSweep): string {
  const rate = sweep.compared === 0 ? 1 : sweep.matched / sweep.compared;
  return `${(rate * 100).toFixed(2)}% (${sweep.matched}/${sweep.compared}) · google-rejected agreed ${sweep.rejectionAgreed}/${sweep.rejectedByGoogle}`;
}

function renderAllowlist(allowlist: ParityAllowlist): string {
  if (allowlist.unexpected === 0 && allowlist.stale === 0) return '<span class="ok">empty</span>';
  return `${allowlist.unexpected} unexpected, ${allowlist.stale} stale`;
}

function renderMethodRow(method: ParityMethod): string {
  const rate = `${(method.matchRate * 100).toFixed(2)}%`;
  const cls = method.matchRate === 1 ? 'ok' : '';
  return `<tr><td><code>${method.method}</code></td><td class="${cls}">${rate} (${method.matched}/${method.total})</td></tr>`;
}
