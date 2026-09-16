#!/usr/bin/env node
// Prepares the package manifest for publishing, runs `pnpm publish` with all passed-through args,
// then restores the source files on success, on failure, and on interrupt. Run from the package
// directory you want to ship. When `publishConfig.directory` names a build output, the manifest in
// that directory is the one that ships and gets prepared, while the source manifest keeps the
// directive so pnpm publishes the output and rewrites `workspace:` ranges from the workspace.
//
// Preparation of the shipped manifest:
//   - Stamps `bundleSize` with the package's measured size-limit figure. The README size badge
//     reads the field from the npm registry, so the published manifest carries the number for the
//     exact version a consumer installs. A measurement failure aborts the publish.
//   - Strips dev-only fields (none are consumer-facing):
//       devDependencies   (tests, conformance, benchmarks; consumers do not install)
//       scripts           (build/copy/typecheck/prepublishOnly; consumers do not run)
//       packageManager    (corepack hint for monorepo development)
//       publishConfig     (publish-time directives; flags passed on CLI instead)
//       imports           (the #dist specifier the bench harness measures the build through)
//
// Usage (in CI):
//   node ../../scripts/safe-publish.mjs --access public --provenance --no-git-checks

import { execSync, spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const STRIP_FIELDS = ['devDependencies', 'scripts', 'packageManager', 'publishConfig', 'imports'];

// The size-limit entry whose measurement ships as the manifest's `bundleSize`. Core publishes the
// browser entry, the figure the initial-bundle badge is about.
const BUNDLE_ENTRY_BY_PACKAGE = {
  '@telixon/core': '@telixon/core (browser entry)',
  '@telixon/web-sdk': '@telixon/web-sdk',
  '@telixon/angular': '@telixon/angular',
};

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

function measureBundleSize(entryName) {
  const measured = JSON.parse(
    execSync('pnpm exec size-limit --json', {
      cwd: repoRoot,
      stdio: ['ignore', 'pipe', 'inherit'],
    }).toString(),
  );
  const entry = measured.find((candidate) => candidate.name === entryName);
  if (!entry) {
    throw new Error(`size-limit reported no entry named "${entryName}"`);
  }
  // size-limit prints kilobytes as bytes over 1000; the stamped figure mirrors its convention.
  return `${(entry.size / 1000).toFixed(2)} kB brotli`;
}

function stripFields(pkg, keep = []) {
  const stripped = STRIP_FIELDS.filter((field) => field in pkg && !keep.includes(field));
  for (const field of stripped) {
    delete pkg[field];
  }
  return stripped;
}

const sourcePath = resolve('package.json');
const sourceOriginal = readFileSync(sourcePath, 'utf8');
const source = JSON.parse(sourceOriginal);

const publishDirectory = source.publishConfig?.directory;
const shippedPath = publishDirectory === undefined ? sourcePath : resolve(publishDirectory, 'package.json');
const shippedOriginal = shippedPath === sourcePath ? sourceOriginal : readFileSync(shippedPath, 'utf8');
const shipped = shippedPath === sourcePath ? source : JSON.parse(shippedOriginal);

const bundleEntry = BUNDLE_ENTRY_BY_PACKAGE[shipped.name];
if (bundleEntry) {
  shipped.bundleSize = measureBundleSize(bundleEntry);
  console.log(`safe-publish: stamped bundleSize ${shipped.bundleSize}`);
} else {
  console.log(`safe-publish: no size-limit entry mapped for ${shipped.name}, bundleSize not stamped`);
}

const stripped = stripFields(shipped);
writeFileSync(shippedPath, JSON.stringify(shipped, null, 2) + '\n');
console.log(`safe-publish: stripped ${stripped.length ? stripped.join(', ') : '(no fields)'}`);

// With a publish directory, the source manifest keeps only the directive pnpm reads. Its lifecycle
// scripts go too, since the output is already built.
if (shippedPath !== sourcePath) {
  stripFields(source, ['publishConfig']);
  source.publishConfig = { directory: publishDirectory };
  writeFileSync(sourcePath, JSON.stringify(source, null, 2) + '\n');
  console.log(`safe-publish: publishing ${publishDirectory}`);
}

// Writes back the original bytes, keeping formatting and key order. Safe to call more than once.
let restored = false;
function restoreSource() {
  if (restored) return;
  restored = true;
  writeFileSync(shippedPath, shippedOriginal);
  if (shippedPath !== sourcePath) writeFileSync(sourcePath, sourceOriginal);
  console.log('safe-publish: source package.json restored');
}

// Async spawn keeps the event loop free; a blocking one would defer these handlers until the child
// exits, which is exactly when an interrupt needs them.
const child = spawn('pnpm', ['publish', ...process.argv.slice(2)], { stdio: 'inherit', shell: false });

for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(signal, () => {
    child.kill(signal);
    restoreSource();
    process.exit(1);
  });
}

child.on('error', (error) => {
  console.error('safe-publish: pnpm publish failed to start:', error);
  restoreSource();
  process.exit(1);
});

child.on('close', (code) => {
  restoreSource();
  process.exit(code ?? 1);
});
