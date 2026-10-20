// Writes the server-rendered React markup into the built page, which the static server then serves as is.
import { readFileSync, writeFileSync } from 'node:fs';

const { render } = await import('../dist/server/entry-server.js');
const page = new URL('../dist/client/react/index.html', import.meta.url);
writeFileSync(
  page,
  readFileSync(page, 'utf8').replace('<!--app-html-->', () => render()),
);
