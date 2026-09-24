// Copies each built example application into the docs' public folder, where a guide embeds it.
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

const demos = [{ from: 'examples/angular/material/dist/browser', to: 'apps/docs/public/demos/angular-material' }];

for (const { from, to } of demos) {
  const source = join(repoRoot, from);
  const target = join(repoRoot, to);
  if (!existsSync(source)) throw new Error(`${from} is missing. Build the example first.`);
  rmSync(target, { recursive: true, force: true });
  mkdirSync(dirname(target), { recursive: true });
  cpSync(source, target, { recursive: true });
  console.log(`${from} -> ${to}`);
}
