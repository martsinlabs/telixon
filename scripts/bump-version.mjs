#!/usr/bin/env node
// Bumps the version of a single package, commits, and creates a strictly-formatted release tag.
// Tag format: `<package>@v<semver>`. Never deviates.
//
// Usage:
//   pnpm bump <package> <patch|minor|major> [--dry-run]
//
// Examples:
//   pnpm bump core patch       # 0.1.0 -> 0.1.1
//   pnpm bump web-sdk minor    # 0.1.0 -> 0.2.0
//   pnpm bump core major --dry-run

import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const [pkgName, bumpType] = args.filter((a) => !a.startsWith('--'));

const VALID_PACKAGES = ['core', 'web-sdk'];
const VALID_BUMPS = ['patch', 'minor', 'major'];

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

function run(cmd, opts = {}) {
  if (dryRun) {
    console.log(`[dry-run] ${cmd}`);
    return '';
  }
  return execSync(cmd, { encoding: 'utf8', stdio: 'pipe', ...opts });
}

if (!pkgName || !bumpType) {
  console.error('Usage: pnpm bump <package> <patch|minor|major> [--dry-run]');
  console.error(`Packages: ${VALID_PACKAGES.join(', ')}`);
  process.exit(1);
}

if (!VALID_PACKAGES.includes(pkgName)) {
  fail(`Unknown package: ${pkgName}. Valid: ${VALID_PACKAGES.join(', ')}`);
}

if (!VALID_BUMPS.includes(bumpType)) {
  fail(`Invalid bump type: ${bumpType}. Valid: ${VALID_BUMPS.join(', ')}`);
}

const pkgDir = join('packages', pkgName);
const pkgJsonPath = join(pkgDir, 'package.json');

if (!existsSync(pkgJsonPath)) {
  fail(`Package not found: ${pkgJsonPath}`);
}

const branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
if (branch !== 'main') {
  fail(`Must be on main branch. Current: ${branch}`);
}

const status = execSync('git status --porcelain', { encoding: 'utf8' });
if (status.trim() !== '') {
  console.error('✗ Working tree not clean:');
  console.error(status);
  process.exit(1);
}

const oldVersion = JSON.parse(readFileSync(pkgJsonPath, 'utf8')).version;

run(`pnpm version ${bumpType} --no-git-tag-version`, { cwd: pkgDir });

const newVersion = dryRun ? `<${bumpType}-bumped>` : JSON.parse(readFileSync(pkgJsonPath, 'utf8')).version;

run('pnpm install --silent');
run(`git add ${pkgJsonPath} pnpm-lock.yaml`);
run(`git commit -m "release(${pkgName}): v${newVersion}"`);

const tag = `${pkgName}@v${newVersion}`;
run(`git tag ${tag}`);

console.log('');
console.log(`✓ ${pkgName}: ${oldVersion} -> ${newVersion}`);
console.log(`✓ Tagged: ${tag}`);
