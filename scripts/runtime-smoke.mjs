#!/usr/bin/env node
// Runtime smoke for the built package: imports the entry given as argv[2] (the Node entry by
// default), loads the engine, and asserts the quick-start behavior. Dependency-free on purpose;
// the same file runs under Node, Deno, and Bun in the CI runtime matrix.

import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const entryPath = resolve(repoRoot, process.argv[2] ?? 'packages/core/dist/index.node.js');

const { ensureEngineReady, parsePhoneNumber } = await import(pathToFileURL(entryPath).href);

await ensureEngineReady();

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    console.error(`runtime-smoke FAIL: ${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    process.exit(1);
  }
}

const international = parsePhoneNumber('+12015550123');
assertEqual(international.isValid(), true, 'international isValid');
assertEqual(international.getRegion(), 'US', 'international getRegion');
assertEqual(international.formatE164(), '+12015550123', 'international formatE164');
assertEqual(international.formatInternational(), '+1 201-555-0123', 'international formatInternational');

const national = parsePhoneNumber('(415) 555-0132', { defaultRegion: 'US' });
assertEqual(national.isValid(), true, 'national isValid');
assertEqual(national.formatE164(), '+14155550132', 'national formatE164');

const invalid = parsePhoneNumber('+1201555', { defaultRegion: 'US' });
assertEqual(invalid.isValid(), false, 'short number isValid');

const withExtension = parsePhoneNumber('+1 201-555-0123 ext. 7');
assertEqual(withExtension.getExtension(), '7', 'extension capture');

console.log(`runtime-smoke PASS: ${entryPath}`);
