#!/usr/bin/env node
// Removes dev-only fields from the current package.json, runs `pnpm publish` with all passed-through
// args, then restores the source file on success, on failure, and on interrupt. Run from the package
// directory you want to ship.
//
// Stripped fields (none are consumer-facing):
//   - devDependencies   (tests, conformance, benchmarks; consumers do not install)
//   - scripts           (build/copy/typecheck/prepublishOnly; consumers do not run)
//   - packageManager    (corepack hint for monorepo development)
//   - publishConfig     (publish-time directives; flags passed on CLI instead)
//
// Usage (in CI):
//   node ../../scripts/safe-publish.mjs --access public --provenance --no-git-checks

import { spawn } from 'node:child_process';
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

// Writes back the original bytes, keeping formatting and key order. Safe to call more than once.
let restored = false;
function restoreSource() {
  if (restored) return;
  restored = true;
  writeFileSync(pkgPath, original);
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
