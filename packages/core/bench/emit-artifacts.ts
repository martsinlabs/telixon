import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, parse } from 'node:path';
import { exportBenchArtifacts } from './artifacts';
import { CORPUS } from './corpus';

// Walks up from the package's main file because `exports` often hide package.json.
function resolvePackageVersion(packageName: string): string {
  const require = createRequire(import.meta.url);
  const root: string = parse(require.resolve(packageName)).root;
  let dir: string = dirname(require.resolve(packageName));
  while (dir !== root) {
    try {
      const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as {
        name?: string;
        version?: string;
      };
      if (pkg.name === packageName && pkg.version) return pkg.version;
    } catch {
      /* keep walking */
    }
    dir = dirname(dir);
  }
  throw new Error(`Could not find package.json for ${packageName}`);
}

const rawPath: string | undefined = process.argv[2];
if (!rawPath) {
  console.error('Usage: tsx emit-artifacts.ts <vitest-bench-output.json>');
  process.exit(1);
}

exportBenchArtifacts(rawPath, CORPUS.length, {
  libphonenumberJs: resolvePackageVersion('libphonenumber-js'),
  googleLibphonenumber: resolvePackageVersion('google-libphonenumber'),
});
console.log('Wrote bench.json + bench-badge.json + benchmark.html to packages/core/bench/dist/');
