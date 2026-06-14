import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import provenance from '../src/engine/PROVENANCE.json';

// ── Types ────────────────────────────────────────────────

interface RawBenchmark {
  readonly name: string;
  readonly rank: number;
  readonly hz: number;
  readonly mean: number;
  readonly median: number;
  readonly p99: number;
  readonly rme: number;
  readonly sampleCount: number;
}

interface RawGroup {
  readonly fullName: string;
  readonly benchmarks: readonly RawBenchmark[];
}

interface RawFile {
  readonly filepath: string;
  readonly groups: readonly RawGroup[];
}

interface RawReport {
  readonly files: readonly RawFile[];
}

const TELIXON = 'telixon';
const LIBPHONENUMBER_JS = 'libphonenumber-js';
const GOOGLE_LIBPHONENUMBER = 'google-libphonenumber';
type Adapter = typeof TELIXON | typeof LIBPHONENUMBER_JS | typeof GOOGLE_LIBPHONENUMBER;
const ADAPTERS: readonly Adapter[] = [TELIXON, LIBPHONENUMBER_JS, GOOGLE_LIBPHONENUMBER];

interface AdapterResult {
  readonly hz: number;
  readonly mean: number;
  readonly p99: number;
  readonly rme: number;
}

interface HotpathRow {
  readonly label: string;
  readonly results: Record<Adapter, AdapterResult | null>;
}

interface InputControllerRow {
  readonly label: string;
  readonly hz: number;
  readonly mean: number;
  readonly p99: number;
  readonly rme: number;
}

interface KeystrokeLatencyDistribution {
  readonly scenario: string;
  readonly sampleCount: number;
  readonly min: number;
  readonly mean: number;
  readonly p50: number;
  readonly p95: number;
  readonly p99: number;
  readonly p999: number;
}

interface KeystrokeLatencyReport {
  readonly frameBudgetMs: number;
  readonly scenarios: readonly KeystrokeLatencyDistribution[];
}

export interface CompetitorVersions {
  readonly libphonenumberJs: string;
  readonly googleLibphonenumber: string;
}

interface BenchData {
  readonly runAt: string;
  readonly commit: string;
  readonly corpusSize: number;
  readonly competitors: CompetitorVersions;
  readonly parse: readonly HotpathRow[];
  readonly strictCold: readonly HotpathRow[];
  readonly cold: readonly HotpathRow[];
  readonly warm: readonly HotpathRow[];
  readonly inputController: readonly InputControllerRow[];
  readonly keystrokeLatency: KeystrokeLatencyReport | null;
  readonly headline: {
    readonly competitor: Adapter;
    readonly medianStrictColdRatio: number;
  };
}

interface ShieldsBadge {
  readonly schemaVersion: 1;
  readonly label: string;
  readonly message: string;
  readonly color: string;
}

// ── Paths ────────────────────────────────────────────────

const BENCH_DIR = dirname(fileURLToPath(import.meta.url));
const ARTIFACT_DIR = join(BENCH_DIR, 'dist');
const TEMPLATE_PATH = join(BENCH_DIR, 'benchmark.template.html');
const KEYSTROKE_LATENCY_PATH = join(ARTIFACT_DIR, 'keystroke-latency.json');
const HOTPATH_FILE_SUFFIX = '/bench/hotpath.bench.ts';
const INPUT_CONTROLLER_FILE_SUFFIX = '/bench/input-controller.bench.ts';

// ── Public entry ─────────────────────────────────────────

export function exportBenchArtifacts(rawPath: string, corpusSize: number, competitors: CompetitorVersions): void {
  const raw: RawReport = JSON.parse(readFileSync(rawPath, 'utf8')) as RawReport;
  const keystrokeLatency: KeystrokeLatencyReport | null = existsSync(KEYSTROKE_LATENCY_PATH)
    ? (JSON.parse(readFileSync(KEYSTROKE_LATENCY_PATH, 'utf8')) as KeystrokeLatencyReport)
    : null;
  const data = buildBenchData(raw, corpusSize, competitors, keystrokeLatency);
  mkdirSync(ARTIFACT_DIR, { recursive: true });
  writeFileSync(join(ARTIFACT_DIR, 'bench.json'), JSON.stringify(data, null, 2) + '\n');
  writeFileSync(join(ARTIFACT_DIR, 'bench-badge.json'), JSON.stringify(buildBadge(), null, 2) + '\n');
  writeFileSync(join(ARTIFACT_DIR, 'benchmark.html'), renderHtml(data));
}

// ── Builders ─────────────────────────────────────────────

function buildBenchData(
  raw: RawReport,
  corpusSize: number,
  competitors: CompetitorVersions,
  keystrokeLatency: KeystrokeLatencyReport | null,
): BenchData {
  const hotpathFile = raw.files.find((file) => file.filepath.endsWith(HOTPATH_FILE_SUFFIX));
  const inputControllerFile = raw.files.find((file) => file.filepath.endsWith(INPUT_CONTROLLER_FILE_SUFFIX));
  if (!hotpathFile) throw new Error(`hotpath bench results missing from ${HOTPATH_FILE_SUFFIX}`);

  const parse: HotpathRow[] = [];
  const strictCold: HotpathRow[] = [];
  const cold: HotpathRow[] = [];
  const warm: HotpathRow[] = [];

  for (const group of hotpathFile.groups) {
    const shortName: string = stripFilePrefix(group.fullName);
    const row: HotpathRow = {
      label: shortName,
      results: toAdapterResults(group.benchmarks),
    };
    if (shortName === 'parsePhoneNumber (corpus pass)') parse.push(row);
    else if (shortName.endsWith('(strict cold)')) strictCold.push(row);
    else if (shortName.endsWith('(cold)')) cold.push(row);
    else if (shortName.endsWith('(warm, pre-parsed)')) warm.push(row);
  }

  const inputController: InputControllerRow[] = [];
  if (inputControllerFile) {
    for (const group of inputControllerFile.groups) {
      const benchmark = group.benchmarks[0];
      if (!benchmark) continue;
      inputController.push({
        label: stripFilePrefix(group.fullName).replace(/^input-controller: /, ''),
        hz: benchmark.hz,
        mean: benchmark.mean,
        p99: benchmark.p99,
        rme: benchmark.rme,
      });
    }
  }

  return {
    runAt: new Date().toISOString(),
    commit: provenance.source.commit,
    corpusSize,
    competitors,
    parse,
    strictCold,
    cold,
    warm,
    inputController,
    keystrokeLatency,
    headline: computeHeadline(strictCold),
  };
}

function stripFilePrefix(fullName: string): string {
  const splitter = ' > ';
  const idx = fullName.indexOf(splitter);
  return idx === -1 ? fullName : fullName.slice(idx + splitter.length);
}

function toAdapterResults(benchmarks: readonly RawBenchmark[]): Record<Adapter, AdapterResult | null> {
  const out: Record<Adapter, AdapterResult | null> = {
    telixon: null,
    'libphonenumber-js': null,
    'google-libphonenumber': null,
  };
  for (const benchmark of benchmarks) {
    if (!isAdapter(benchmark.name)) continue;
    out[benchmark.name] = {
      hz: benchmark.hz,
      mean: benchmark.mean,
      p99: benchmark.p99,
      rme: benchmark.rme,
    };
  }
  return out;
}

function isAdapter(name: string): name is Adapter {
  return (ADAPTERS as readonly string[]).includes(name);
}

// Median strict-cold ratio is the most conservative claim; libphonenumber-js is the npm-share anchor.
function computeHeadline(strictCold: readonly HotpathRow[]): BenchData['headline'] {
  const ratios: number[] = [];
  for (const row of strictCold) {
    const telixon = row.results.telixon;
    const competitor = row.results[LIBPHONENUMBER_JS];
    if (telixon && competitor) ratios.push(telixon.hz / competitor.hz);
  }
  ratios.sort((a, b) => a - b);
  const medianStrictColdRatio = ratios.length === 0 ? 0 : (ratios[Math.floor(ratios.length / 2)] ?? 0);
  return { competitor: LIBPHONENUMBER_JS, medianStrictColdRatio };
}

function buildBadge(): ShieldsBadge {
  return {
    schemaVersion: 1,
    label: 'benchmarks',
    message: 'live',
    color: 'blue',
  };
}

// ── HTML rendering ───────────────────────────────────────

function renderHtml(data: BenchData): string {
  const template: string = readFileSync(TEMPLATE_PATH, 'utf8');
  const tokens: Record<string, string> = {
    '{{commit}}': data.commit,
    '{{shortCommit}}': data.commit.slice(0, 7),
    '{{corpusSize}}': data.corpusSize.toLocaleString('en-US'),
    '{{libphonenumberJsVersion}}': data.competitors.libphonenumberJs,
    '{{googleLibphonenumberVersion}}': data.competitors.googleLibphonenumber,
    '{{runAt}}': data.runAt,
    '{{parseRows}}': data.parse.map((row) => renderHotpathRow(row, /*method=*/ false)).join('\n        '),
    '{{strictColdRows}}': data.strictCold.map((row) => renderHotpathRow(row, /*method=*/ true)).join('\n        '),
    '{{coldRows}}': data.cold.map((row) => renderHotpathRow(row, /*method=*/ true)).join('\n        '),
    '{{warmRows}}': data.warm.map((row) => renderHotpathRow(row, /*method=*/ true)).join('\n        '),
    '{{inputControllerRows}}': data.inputController.map(renderInputControllerRow).join('\n        '),
    '{{keystrokeHero}}': renderKeystrokeHero(data),
    '{{keystrokeLatencyRows}}': renderKeystrokeLatencyRows(data.keystrokeLatency),
    '{{keystrokeLatencyVerdict}}': renderKeystrokeLatencyVerdict(data.keystrokeLatency),
    '{{ogTitle}}': renderOgTitle(),
    '{{ogDescription}}': renderOgDescription(data),
  };
  return Object.entries(tokens).reduce((html, [token, value]) => html.split(token).join(value), template);
}

// The three statements a reader should leave with, plus the frame bar for scale: median keystroke, p99 headroom in a 60 Hz frame, and a full corpus pass against one frame.
function renderKeystrokeHero(data: BenchData): string {
  const report = data.keystrokeLatency;
  if (!report || report.scenarios.length === 0) return '';

  const insertScenario = report.scenarios[0]!;
  const worstP99 = report.scenarios.reduce((max, s) => (s.p99 > max ? s.p99 : max), 0);
  const headroom = Math.round(report.frameBudgetMs / worstP99).toLocaleString('en-US');
  const p99Percent = ((worstP99 / report.frameBudgetMs) * 100).toFixed(3);

  const typeThrough = data.inputController.find((row) => row.label.startsWith('type-through full number'));
  const corpusCard = typeThrough
    ? `<div class="stat-card"><div class="stat-value">${formatLatency(typeThrough.mean)}</div>` +
      `<div class="stat-label">the whole corpus, typed</div>` +
      `<div class="stat-sub">every digit of all ${data.corpusSize.toLocaleString('en-US')} numbers` +
      `${typeThrough.mean < report.frameBudgetMs ? ', inside one frame' : ''}</div></div>`
    : '';

  const fillPercent = ((worstP99 / report.frameBudgetMs) * 100).toFixed(4);

  return (
    `<div class="hero-stats">` +
    `<div class="stat-card"><div class="stat-value">${formatLatency(insertScenario.p50)}</div>` +
    `<div class="stat-label">median keystroke</div>` +
    `<div class="stat-sub">insert + resolve + format + caret</div></div>` +
    `<div class="stat-card"><div class="stat-value">${headroom}&times;</div>` +
    `<div class="stat-label">headroom in one frame</div>` +
    `<div class="stat-sub">p99 keystroke ${formatLatency(worstP99)} of the 16.67 ms budget</div></div>` +
    corpusCard +
    `</div>` +
    `<div class="frame-bar"><div class="frame-bar-fill" style="width: ${fillPercent}%"></div></div>` +
    `<div class="frame-bar-caption">One 60 Hz frame. The line at the left edge is the p99 keystroke ` +
    `(${formatLatency(worstP99)}), drawn at minimum visible width; to scale it would be ${p99Percent}% of the bar.</div>`
  );
}

function renderKeystrokeLatencyRows(report: KeystrokeLatencyReport | null): string {
  if (!report) return '';
  return report.scenarios
    .map((scenario) => {
      return `<tr><td>${escapeHtml(scenario.scenario)}</td><td>${scenario.sampleCount.toLocaleString('en-US')}</td><td>${formatLatency(scenario.mean)}</td><td>${formatLatency(scenario.p50)}</td><td>${formatLatency(scenario.p95)}</td><td>${formatLatency(scenario.p99)}</td><td>${formatLatency(scenario.p999)}</td></tr>`;
    })
    .join('\n        ');
}

function renderKeystrokeLatencyVerdict(report: KeystrokeLatencyReport | null): string {
  if (!report) return '';
  const totalSamples = report.scenarios.reduce((sum, s) => sum + s.sampleCount, 0);
  const worstP99 = report.scenarios.reduce((max, s) => (s.p99 > max ? s.p99 : max), 0);
  const worstP999 = report.scenarios.reduce((max, s) => (s.p999 > max ? s.p999 : max), 0);
  const totalSamplesFormatted = totalSamples.toLocaleString('en-US');
  const p99Headroom = Math.round(report.frameBudgetMs / worstP99).toLocaleString('en-US');
  const p999Percent = ((worstP999 / report.frameBudgetMs) * 100).toFixed(3);
  const p999Headroom = Math.round(report.frameBudgetMs / worstP999).toLocaleString('en-US');
  return (
    `<p>Across ${totalSamplesFormatted} sampled keystrokes, the 99th percentile is ${formatLatency(worstP99)} ` +
    `(${p99Headroom}&times; frame-budget headroom) and the 99.9th is ${formatLatency(worstP999)} ` +
    `(${p999Percent}% of the 16.67 ms budget, ${p999Headroom}&times; headroom). The single maximum is omitted: ` +
    `the maximum of a sample set is dominated by OS scheduling, not the code, and grows with sample count.</p>` +
    `<p><strong>Phone-number processing alone cannot cause UI frame drops on a 60Hz display.</strong></p>`
  );
}

function formatLatency(ms: number): string {
  if (ms >= 1) return `${ms.toFixed(2)} ms`;
  const us = ms * 1000;
  if (us >= 1) return `${us.toFixed(2)} &micro;s`;
  return `${(us * 1000).toFixed(0)} ns`;
}

function formatLatencyPlain(ms: number): string {
  if (ms >= 1) return `${ms.toFixed(2)} ms`;
  const us = ms * 1000;
  if (us >= 1) return `${us.toFixed(2)} μs`;
  return `${(us * 1000).toFixed(0)} ns`;
}

function renderOgTitle(): string {
  return 'Telixon benchmarks';
}

function renderOgDescription(data: BenchData): string {
  const parts: string[] = ['Reproducible benchmark vs libphonenumber-js and google-libphonenumber.'];
  if (data.headline.medianStrictColdRatio > 0) {
    parts.push(`Strict-cold median ${data.headline.medianStrictColdRatio.toFixed(1)}× vs ${data.headline.competitor}.`);
  }
  if (data.keystrokeLatency) {
    const worstP99 = data.keystrokeLatency.scenarios.reduce((max, s) => Math.max(max, s.p99), 0);
    const headroom = Math.round(data.keystrokeLatency.frameBudgetMs / worstP99).toLocaleString('en-US');
    parts.push(`Per-keystroke p99: ${formatLatencyPlain(worstP99)} (${headroom}× UI headroom at 60Hz).`);
  }
  return parts.join(' ');
}

function renderHotpathRow(row: HotpathRow, isMethodRow: boolean): string {
  const label: string = isMethodRow ? extractMethodLabel(row.label) : row.label;
  const telixon = row.results.telixon;
  const libphonenumberJs = row.results[LIBPHONENUMBER_JS];
  const google = row.results[GOOGLE_LIBPHONENUMBER];
  const telixonHz: string = telixon ? formatHz(telixon.hz) : '-';
  const libphonenumberJsHz: string = libphonenumberJs ? formatHz(libphonenumberJs.hz) : '-';
  const googleHz: string = google ? formatHz(google.hz) : '-';
  const vsLibphonenumberJs: string = telixon && libphonenumberJs ? renderRatio(telixon.hz / libphonenumberJs.hz) : '-';
  const vsGoogle: string = telixon && google ? renderRatio(telixon.hz / google.hz) : '-';
  return `<tr><td><code>${escapeHtml(label)}</code></td><td>${telixonHz}</td><td>${libphonenumberJsHz}</td><td>${googleHz}</td><td>${vsLibphonenumberJs}</td><td>${vsGoogle}</td></tr>`;
}

function renderInputControllerRow(row: InputControllerRow): string {
  return `<tr><td>${escapeHtml(row.label)}</td><td>${formatHz(row.hz)}</td><td>${row.mean.toFixed(2)}</td><td>${row.p99.toFixed(2)}</td><td>±${row.rme.toFixed(2)}%</td></tr>`;
}

// Extracts the bare method name from describe titles like "parse + X (strict cold)" or "X (warm, pre-parsed)".
function extractMethodLabel(describe: string): string {
  const parseMatch = describe.match(/^parse \+ (\S+) \((?:strict )?cold\)$/);
  if (parseMatch?.[1]) return parseMatch[1];
  const warmMatch = describe.match(/^(\S+) \(warm, pre-parsed\)$/);
  if (warmMatch?.[1]) return warmMatch[1];
  return describe;
}

function formatHz(hz: number): string {
  if (hz >= 1_000_000) return `${(hz / 1_000_000).toFixed(2)}M`;
  if (hz >= 1_000) return `${(hz / 1_000).toFixed(1)}k`;
  return hz.toFixed(0);
}

function renderRatio(ratio: number): string {
  if (ratio >= 1.05) return `<span class="win">${ratio.toFixed(2)}×</span>`;
  if (ratio <= 0.95) return `<span class="loss">${ratio.toFixed(2)}×</span>`;
  return `${ratio.toFixed(2)}×`;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
