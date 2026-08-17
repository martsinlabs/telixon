#!/usr/bin/env node
// Runtime smoke for the browser build: serves packages/core/dist over HTTP, loads the browser
// entry as a module in headless Chromium, and asserts the quick-start behavior end to end,
// engine streaming included.

import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const distRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../packages/core/dist');

const PAGE = `<!doctype html>
<script type="module">
  import { ensureEngineReady, parsePhoneNumber } from '/index.browser.js';
  window.__smoke = (async () => {
    await ensureEngineReady();
    const international = parsePhoneNumber('+12015550123');
    const national = parsePhoneNumber('(415) 555-0132', { defaultRegion: 'US' });
    return {
      valid: international.isValid(),
      region: international.getRegion(),
      e164: international.formatE164(),
      nationalE164: national.formatE164(),
    };
  })();
</script>`;

const CONTENT_TYPES = { '.js': 'text/javascript', '.json': 'application/json' };

const server = createServer(async (request, response) => {
  if (request.url === '/' || request.url === '/index.html') {
    response.writeHead(200, { 'content-type': 'text/html' });
    response.end(PAGE);
    return;
  }
  try {
    const filePath = join(distRoot, normalize(request.url).replace(/^([.][.][/\\])+/, ''));
    const body = await readFile(filePath);
    response.writeHead(200, { 'content-type': CONTENT_TYPES[extname(filePath)] ?? 'application/octet-stream' });
    response.end(body);
  } catch {
    response.writeHead(404);
    response.end();
  }
});

await new Promise((ready) => server.listen(0, '127.0.0.1', ready));
const { port } = server.address();

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const failures = [];
  page.on('pageerror', (error) => failures.push(String(error)));
  await page.goto(`http://127.0.0.1:${port}/`);
  // Runs inside Chromium where window exists; eslint checks this file with the node globals.
  // eslint-disable-next-line no-undef
  const result = await page.evaluate(() => window.__smoke);

  const expected = { valid: true, region: 'US', e164: '+12015550123', nationalE164: '+14155550132' };
  for (const [key, value] of Object.entries(expected)) {
    if (result[key] !== value)
      failures.push(`${key}: expected ${JSON.stringify(value)}, got ${JSON.stringify(result[key])}`);
  }
  if (failures.length > 0) {
    console.error('runtime-smoke-browser FAIL:', failures.join('; '));
    process.exit(1);
  }
  console.log('runtime-smoke-browser PASS: index.browser.js in Chromium');
} finally {
  await browser.close();
  server.close();
}
