// Compiles the schematics to CommonJS next to the library build, copies their JSON, and loads the result the way the
// Angular CLI will, which fails the build on a wrong factory path, an ESM leak, or a schema the CLI rejects.
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(packageRoot, process.argv[2] ?? 'dist/schematics');
const copiedFiles = ['collection.json', 'ng-add/schema.json'];

const compile = spawnSync(
  process.execPath,
  [require.resolve('typescript/bin/tsc'), '-p', 'tsconfig.schematics.build.json', '--outDir', outDir],
  { cwd: packageRoot, stdio: 'inherit' },
);
if (compile.status !== 0) process.exit(compile.status ?? 1);

for (const file of copiedFiles) {
  mkdirSync(dirname(join(outDir, file)), { recursive: true });
  cpSync(join(packageRoot, 'schematics', file), join(outDir, file));
}

const collectionPath = join(outDir, 'collection.json');
const collection = JSON.parse(readFileSync(collectionPath, 'utf8'));
for (const [name, entry] of Object.entries(collection.schematics)) {
  const [factoryPath, exportName] = entry.factory.split('#');
  const factory = require(resolve(dirname(collectionPath), factoryPath));
  if (typeof factory[exportName] !== 'function') {
    throw new Error(`${name}: ${entry.factory} exports no function named "${exportName}"`);
  }
  const schema = JSON.parse(readFileSync(resolve(dirname(collectionPath), entry.schema), 'utf8'));
  if (!('$id' in schema)) throw new Error(`${name}: ${entry.schema} needs a "$id"`);
}
console.log(`schematics: ${Object.keys(collection.schematics).length} packaged into ${outDir}`);
