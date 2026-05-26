import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { DivergenceAudit } from './known-divergences';
import { ConformanceReport } from './models';

// ── Types ────────────────────────────────────────────────

interface ParityMethod {
  readonly method: string;
  readonly total: number;
  readonly matched: number;
  readonly matchRate: number;
}

interface ParityCorpus {
  readonly size: number;
  readonly skipped: number;
  readonly regionsCovered: number;
  readonly regionsTotal: number;
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
  readonly allowlist: ParityAllowlist;
}

interface ShieldsBadge {
  readonly schemaVersion: 1;
  readonly label: string;
  readonly message: string;
  readonly color: string;
}

// ── Paths and template ───────────────────────────────────

// Resolved against process.cwd() so the output location is identical in local runs and CI.
// `pnpm conformance` is always invoked from the repo root.
const CONFORMANCE_DIR = resolve('packages/core/conformance');
const ARTIFACT_DIR = join(CONFORMANCE_DIR, 'dist');
const TEMPLATE = readFileSync(join(CONFORMANCE_DIR, 'parity.template.html'), 'utf8');

const METHOD_ROW_INDENT = '\n        ';

// ── Public entry (I/O boundary) ──────────────────────────

// Writes parity.json, parity-badge.json, parity.html into packages/core/conformance/dist/.
// Called from conformance.test.ts after the report is built; runs even if assertions fail so the
// dashboard always reflects current state.
export function exportArtifacts(report: ConformanceReport, audit: DivergenceAudit): void {
  const data = buildParityData(report, audit);
  mkdirSync(ARTIFACT_DIR, { recursive: true });
  writeFileSync(join(ARTIFACT_DIR, 'parity.json'), JSON.stringify(data, null, 2));
  writeFileSync(join(ARTIFACT_DIR, 'parity-badge.json'), JSON.stringify(buildBadge(data), null, 2));
  writeFileSync(join(ARTIFACT_DIR, 'parity.html'), renderHtml(data));
}

// ── Pure builders ────────────────────────────────────────

function buildParityData(report: ConformanceReport, audit: DivergenceAudit): ParityData {
  return {
    runAt: new Date().toISOString(),
    commit: report.commit,
    corpus: {
      size: report.corpusSize,
      skipped: report.skipped,
      regionsCovered: report.regionsCovered,
      regionsTotal: report.regionsTotal,
    },
    overall: sumOverall(report),
    methods: report.methods.map((m) => ({
      method: m.method,
      total: m.total,
      matched: m.matched,
      matchRate: m.matchRate,
    })),
    allowlist: { unexpected: audit.unexpected.length, stale: audit.stale.length },
  };
}

function sumOverall(report: ConformanceReport): ParityOverall {
  const { matched, total } = report.methods.reduce(
    (acc, m) => ({ matched: acc.matched + m.matched, total: acc.total + m.total }),
    { matched: 0, total: 0 },
  );
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
    '{{regionsCovered}}': String(data.corpus.regionsCovered),
    '{{regionsTotal}}': String(data.corpus.regionsTotal),
    '{{skipped}}': String(data.corpus.skipped),
    '{{allowlist}}': renderAllowlist(data.allowlist),
    '{{runAt}}': data.runAt,
    '{{methodRows}}': data.methods.map(renderMethodRow).join(METHOD_ROW_INDENT),
  };
  return Object.entries(tokens).reduce((html, [token, value]) => html.split(token).join(value), TEMPLATE);
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
