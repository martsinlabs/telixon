// Measures the chunks from `vite build` and writes the bundle-size proof published at telixon.dev/bundle.html.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync, gzipSync, constants as zlibConstants } from 'node:zlib';

// ── Types ────────────────────────────────────────────────

type ChunkRole = 'initial' | 'engine';

interface Chunk {
  readonly file: string;
  readonly role: ChunkRole;
  readonly raw: number;
  readonly gzip: number;
  readonly brotli: number;
}

interface BundleData {
  readonly runAt: string;
  readonly commit: string;
  readonly chunks: readonly Chunk[];
  readonly initialGzip: number;
  readonly engineGzip: number;
  readonly engineChunkCount: number;
}

interface ShieldsBadge {
  readonly schemaVersion: 1;
  readonly label: string;
  readonly message: string;
  readonly color: string;
}

interface Provenance {
  readonly source: { readonly commit: string };
}

// ── Paths ────────────────────────────────────────────────

const EXAMPLE_DIR = dirname(fileURLToPath(import.meta.url));
const ASSET_DIR = join(EXAMPLE_DIR, 'dist', 'assets');
const REPORT_DIR = join(EXAMPLE_DIR, 'report');
const TEMPLATE_PATH = join(EXAMPLE_DIR, 'bundle.template.html');

// Engine layers are emitted as `<layer>.bin-<hash>.js`; every other chunk is the app's initial code.
const ENGINE_CHUNK_PATTERN = /\.bin-[\w-]+\.js$/;

// ── Entry ────────────────────────────────────────────────

function main(): void {
  if (!existsSync(ASSET_DIR)) {
    throw new Error(`No build output at ${ASSET_DIR}. Run \`vite build\` first.`);
  }
  const data = collectBundleData();
  mkdirSync(REPORT_DIR, { recursive: true });
  writeFileSync(join(REPORT_DIR, 'bundle.json'), JSON.stringify(data, null, 2) + '\n');
  writeFileSync(join(REPORT_DIR, 'bundle-badge.json'), JSON.stringify(buildBadge(data), null, 2) + '\n');
  writeFileSync(join(REPORT_DIR, 'bundle.html'), renderHtml(data));
  console.log(`Wrote bundle.json + bundle-badge.json + bundle.html to ${REPORT_DIR}`);
  console.log(`Initial bundle: ${formatBytes(data.initialGzip)} gzip; engine: ${formatBytes(data.engineGzip)} gzip.`);
}

// ── Measure ──────────────────────────────────────────────

function collectBundleData(): BundleData {
  const chunks: readonly Chunk[] = readdirSync(ASSET_DIR)
    .filter((file) => file.endsWith('.js'))
    .map(measureChunk)
    .sort(byReportOrder);

  const initialChunks = chunks.filter((chunk) => chunk.role === 'initial');
  const engineChunks = chunks.filter((chunk) => chunk.role === 'engine');
  if (engineChunks.length === 0) {
    throw new Error('No engine chunks matched; the lazy-chunk split or its naming changed.');
  }

  return {
    runAt: new Date().toISOString(),
    commit: readEngineCommit(),
    chunks,
    initialGzip: sumSizes(initialChunks, (chunk) => chunk.gzip),
    engineGzip: sumSizes(engineChunks, (chunk) => chunk.gzip),
    engineChunkCount: engineChunks.length,
  };
}

function measureChunk(file: string): Chunk {
  const bytes = readFileSync(join(ASSET_DIR, file));
  return {
    file,
    role: ENGINE_CHUNK_PATTERN.test(file) ? 'engine' : 'initial',
    raw: bytes.byteLength,
    // Maximum compression on both, so the figures are the smallest a server could transfer.
    gzip: gzipSync(bytes, { level: 9 }).byteLength,
    brotli: brotliCompressSync(bytes, { params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 11 } }).byteLength,
  };
}

// Initial chunk first (the headline), then engine layers largest to smallest.
function byReportOrder(a: Chunk, b: Chunk): number {
  if (a.role !== b.role) return a.role === 'initial' ? -1 : 1;
  return b.gzip - a.gzip;
}

// Read the engine's source commit from the resolved package's published artifact, the same file a consumer installs.
function readEngineCommit(): string {
  const require = createRequire(import.meta.url);
  const provenancePath = join(dirname(require.resolve('@telixon/core')), 'engine', 'PROVENANCE.json');
  const provenance = JSON.parse(readFileSync(provenancePath, 'utf8')) as Provenance;
  return provenance.source.commit;
}

function buildBadge(data: BundleData): ShieldsBadge {
  return {
    schemaVersion: 1,
    label: 'initial bundle',
    message: `${formatBytes(data.initialGzip)} gzip`,
    color: '26997b',
  };
}

// ── Render ───────────────────────────────────────────────

function renderHtml(data: BundleData): string {
  const template = readFileSync(TEMPLATE_PATH, 'utf8');
  const inlinedGzip = data.initialGzip + data.engineGzip;
  const initialShare = (data.initialGzip / inlinedGzip) * 100;
  const tokens: Record<string, string> = {
    '{{commit}}': data.commit,
    '{{shortCommit}}': data.commit.slice(0, 7),
    '{{runAt}}': data.runAt,
    '{{initialGzip}}': formatBytes(data.initialGzip),
    '{{engineGzip}}': formatBytes(data.engineGzip),
    '{{engineChunkCount}}': String(data.engineChunkCount),
    '{{inlinedGzip}}': formatBytes(inlinedGzip),
    '{{initialBarPercent}}': initialShare.toFixed(1),
    '{{engineBarPercent}}': (100 - initialShare).toFixed(1),
    '{{chunkRows}}': renderChunkRows(data),
    '{{ogTitle}}': '@telixon/core bundle size',
    '{{ogDescription}}': renderOgDescription(data, inlinedGzip),
  };
  return Object.entries(tokens).reduce((html, [token, value]) => html.split(token).join(value), template);
}

function renderChunkRows(data: BundleData): string {
  return [...data.chunks.map(renderChunkRow), renderTotalRow(data)].join('\n        ');
}

function renderChunkRow(chunk: Chunk): string {
  const roleLabel: string = chunk.role === 'initial' ? 'initial' : 'engine, lazy';
  return (
    `<tr><td><code>${escapeHtml(chunk.file)}</code></td>` +
    `<td class="role-${chunk.role}">${roleLabel}</td>` +
    `<td>${formatBytes(chunk.raw)}</td><td>${formatBytes(chunk.gzip)}</td><td>${formatBytes(chunk.brotli)}</td></tr>`
  );
}

function renderTotalRow(data: BundleData): string {
  const raw = sumSizes(data.chunks, (chunk) => chunk.raw);
  const gzip = sumSizes(data.chunks, (chunk) => chunk.gzip);
  const brotli = sumSizes(data.chunks, (chunk) => chunk.brotli);
  return (
    `<tr class="total"><td>Total on disk</td><td></td>` +
    `<td>${formatBytes(raw)}</td><td>${formatBytes(gzip)}</td><td>${formatBytes(brotli)}</td></tr>`
  );
}

function renderOgDescription(data: BundleData, inlinedGzip: number): string {
  return (
    `Initial bundle ${formatBytes(data.initialGzip)} gzip; the engine ships as ${data.engineChunkCount} lazy chunks ` +
    `(${formatBytes(data.engineGzip)}) fetched on demand. Analyzers that inline dynamic imports report ` +
    `${formatBytes(inlinedGzip)}.`
  );
}

// ── Helpers ──────────────────────────────────────────────

function sumSizes(chunks: readonly Chunk[], sizeOf: (chunk: Chunk) => number): number {
  return chunks.reduce((total, chunk) => total + sizeOf(chunk), 0);
}

function formatBytes(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

main();
