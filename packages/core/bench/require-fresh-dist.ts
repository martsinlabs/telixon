import { readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Benchmarks measure the built package through the #dist specifier. A dist older than src would
// silently describe outdated code; fail loudly and ask for a build instead.
const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

function newestMtime(directory: string): number {
  let newest = 0;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const entryPath = join(directory, entry.name);
    const mtime: number = entry.isDirectory() ? newestMtime(entryPath) : statSync(entryPath).mtimeMs;
    if (mtime > newest) newest = mtime;
  }
  return newest;
}

let builtEntryMtime: number;
try {
  builtEntryMtime = statSync(join(packageRoot, 'dist/index.node.js')).mtimeMs;
} catch {
  throw new Error('Benchmarks measure the built package; run `pnpm build` first.');
}

if (newestMtime(join(packageRoot, 'src')) > builtEntryMtime) {
  throw new Error('dist is older than src; run `pnpm build` before benchmarking.');
}
