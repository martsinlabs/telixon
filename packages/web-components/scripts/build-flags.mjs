// Copies the web-sdk flag sprite into dist/flags and appends the rules of the flag element to flags.css.
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const assets = join(packageRoot, '../web-sdk/src/flags/assets');
const target = join(packageRoot, 'dist/flags');
mkdirSync(target, { recursive: true });
for (const file of ['sprite.png', 'sprite@2x.png']) copyFileSync(join(assets, file), join(target, file));

// Both files name the sprite next to them, which is where this puts it.
const sheet = readFileSync(join(assets, 'flags.css'), 'utf8');
const flagElement = readFileSync(join(packageRoot, 'src/flag/flag.css'), 'utf8');
writeFileSync(join(target, 'flags.css'), `${sheet.trimEnd()}\n\n${flagElement}`);
