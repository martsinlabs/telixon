#!/usr/bin/env node
// Runtime smoke for the edge build: boots the smoke worker under workerd through Miniflare and
// asserts the quick-start behavior returned by its fetch handler.

import { Miniflare } from 'miniflare';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const miniflare = new Miniflare({
  modules: true,
  modulesRoot: repoRoot,
  scriptPath: resolve(repoRoot, 'scripts/runtime-smoke-edge-worker.mjs'),
  // The built entries use the .js extension; classify them as ES modules for workerd.
  modulesRules: [{ type: 'ESModule', include: ['**/*.js', '**/*.mjs'] }],
  compatibilityDate: '2026-01-01',
});

try {
  const response = await miniflare.dispatchFetch('http://smoke/');
  const result = await response.json();

  const expected = { valid: true, region: 'US', e164: '+12015550123', nationalE164: '+14155550132' };
  const failures = [];
  for (const [key, value] of Object.entries(expected)) {
    if (result[key] !== value)
      failures.push(`${key}: expected ${JSON.stringify(value)}, got ${JSON.stringify(result[key])}`);
  }
  if (failures.length > 0) {
    console.error('runtime-smoke-edge FAIL:', failures.join('; '));
    process.exit(1);
  }
  console.log('runtime-smoke-edge PASS: index.edge.js under workerd');
} finally {
  await miniflare.dispose();
}
