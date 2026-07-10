// Scans a built site for internal references that do not resolve: every href and src in the
// emitted HTML, plus same-page anchors. Exits non-zero on the first report of broken targets,
// so CI fails before a deploy can ship a dead link.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const distRoot = resolve(process.argv[2] ?? 'dist');

function collectHtmlFiles(directory) {
  const files = [];
  for (const entry of readdirSync(directory)) {
    const entryPath = join(directory, entry);
    if (statSync(entryPath).isDirectory()) files.push(...collectHtmlFiles(entryPath));
    else if (entry.endsWith('.html')) files.push(entryPath);
  }
  return files;
}

function targetExists(filePath) {
  return (
    (existsSync(filePath) && statSync(filePath).isFile()) ||
    existsSync(join(filePath, 'index.html')) ||
    existsSync(filePath.replace(/\/+$/, '') + '.html')
  );
}

const pages = collectHtmlFiles(distRoot);
let resolvedCount = 0;
const broken = [];

for (const page of pages) {
  const html = readFileSync(page, 'utf8');
  const anchorIds = new Set([...html.matchAll(/(?:id|name)="([^"]+)"/g)].map((match) => match[1]));
  const references = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((match) => match[1]);

  for (const reference of references) {
    if (/^(?:https?:|mailto:|data:)/.test(reference)) continue;

    if (reference.startsWith('#')) {
      if (anchorIds.has(reference.slice(1))) resolvedCount++;
      else broken.push(`${page}: missing anchor ${reference}`);
      continue;
    }

    const path = decodeURIComponent(reference.split('#')[0].split('?')[0]);
    if (path === '') continue;
    const filePath = path.startsWith('/') ? join(distRoot, path) : join(dirname(page), path);
    if (targetExists(filePath)) resolvedCount++;
    else broken.push(`${page}: broken ${reference}`);
  }
}

console.log(`${pages.length} pages, ${resolvedCount} internal references resolved, ${broken.length} broken`);
for (const report of broken) console.error('  ' + report);
process.exit(broken.length === 0 ? 0 : 1);
