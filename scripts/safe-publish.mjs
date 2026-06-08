#!/usr/bin/env node
// Atomically removes dev-only fields from the current package.json, runs
// `pnpm publish` with all passed-through args, then restores the source file
// regardless of outcome. Run from the package directory you want to ship.
//
// Stripped fields (none are consumer-facing):
//   - devDependencies   (tests, conformance, benchmarks; consumers do not install)
//   - scripts           (build/copy/typecheck/prepublishOnly; consumers do not run)
//   - packageManager    (corepack hint for monorepo development)
//   - publishConfig     (publish-time directives; flags passed on CLI instead)
//
// Usage (in CI):
//   node ../../scripts/safe-publish.mjs --access public --provenance --no-git-checks

import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const STRIP_FIELDS = ['devDependencies', 'scripts', 'packageManager', 'publishConfig'];

const pkgPath = resolve('package.json');
const original = readFileSync(pkgPath, 'utf8');
const pkg = JSON.parse(original);

const stripped = STRIP_FIELDS.filter((field) => field in pkg);
for (const field of stripped) {
  delete pkg[field];
}

writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

console.log(`safe-publish: stripped ${stripped.length ? stripped.join(', ') : '(no fields)'}`);

let exitCode = 1;
try {
  const result = spawnSync('pnpm', ['publish', ...process.argv.slice(2)], {
    stdio: 'inherit',
    shell: false,
  });
  exitCode = result.status ?? 1;
} catch (error) {
  console.error('safe-publish: pnpm publish crashed:', error);
} finally {
  writeFileSync(pkgPath, original);
  console.log('safe-publish: source package.json restored');
}

process.exit(exitCode);
