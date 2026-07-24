// Regenerates the measured sizes the Verified page renders, so the table can never go stale.
// Entry sizes come from size-limit; the engine figure is the gzip payload inside the embedded modules.
import { execSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = join(repoRoot, 'apps/docs/src/generated/size.json');

// size-limit prints kilobytes as bytes over 1000; the page mirrors its convention.
const kilobytes = (bytes) => (bytes / 1000).toFixed(2);

function embeddedGzipBytes() {
  const dir = join(repoRoot, 'packages/core/dist/engine/embedded');
  let total = 0;
  for (const file of readdirSync(dir)) {
    const source = readFileSync(join(dir, file), 'utf8');
    for (const match of source.matchAll(/"([A-Za-z0-9+/=]{100,})"/g)) {
      total += Buffer.from(match[1], 'base64').length;
    }
  }
  return total;
}

try {
  const measured = JSON.parse(
    execSync('pnpm exec size-limit --json', { cwd: repoRoot, stdio: ['ignore', 'pipe', 'ignore'] }).toString(),
  );
  const budgets = JSON.parse(readFileSync(join(repoRoot, '.size-limit.json'), 'utf8'));
  const budgetByName = Object.fromEntries(budgets.map((entry) => [entry.name, entry.limit]));

  const entries = measured.map((entry) => ({
    artifact: entry.name,
    measured: `${kilobytes(entry.size)} kB brotli`,
    budget: budgetByName[entry.name],
  }));

  const size = {
    nodeEntry: entries.find((entry) => entry.artifact.includes('Node entry')),
    browserEntry: entries.find((entry) => entry.artifact.includes('browser entry')),
    webSdk: entries.find((entry) => entry.artifact === '@telixon/web-sdk'),
    engineTables: `${Math.round(embeddedGzipBytes() / 1000)} kB`,
  };

  writeFileSync(outputPath, JSON.stringify(size, null, 2) + '\n');
  console.log(
    `size.json regenerated: ${size.nodeEntry.measured}, ${size.browserEntry.measured}, ${size.webSdk.measured}, engine ${size.engineTables}`,
  );
} catch (error) {
  if (existsSync(outputPath)) {
    console.warn(`size.json regeneration failed, keeping the committed figures: ${error.message}`);
  } else {
    throw error;
  }
}
