import { existsSync, readFileSync } from 'node:fs';
import { IncomingMessage, ServerResponse } from 'node:http';
import { extname, resolve } from 'node:path';
import { defineConfig, Plugin, ViteDevServer } from 'vite';

const ROOT_DIR = resolve(import.meta.dirname, '../..');
const CORE_SRC_DIR = resolve(ROOT_DIR, 'packages/core/src');
const ENGINE_DIR = resolve(CORE_SRC_DIR, 'engine');
const ENGINE_URL_PREFIX = '/engine/';
const CORE_ALIASES = [
  {
    find: /^@telixon\/core\/(.+)$/,
    replacement: resolve(CORE_SRC_DIR, '$1'),
  },
  {
    find: '@telixon/core',
    replacement: resolve(CORE_SRC_DIR, 'index.browser.ts'),
  },
];

type Next = () => void;

function resolveEngineContentType(filePath: string): string {
  return extname(filePath) === '.json' ? 'application/json' : 'application/octet-stream';
}

function resolveEngineFilePath(url: string): string | null {
  if (!url.startsWith(ENGINE_URL_PREFIX)) {
    return null;
  }

  return resolve(ENGINE_DIR, url.slice(ENGINE_URL_PREFIX.length));
}

function serveEngineAsset(req: IncomingMessage, res: ServerResponse, next: Next): void {
  const url: string | undefined = req.url;

  if (url == null) {
    next();
    return;
  }

  const filePath: string | null = resolveEngineFilePath(url);

  if (filePath == null || !existsSync(filePath)) {
    next();
    return;
  }

  res.setHeader('Content-Type', resolveEngineContentType(filePath));
  res.end(readFileSync(filePath));
}

function createEngineAssetsPlugin(): Plugin {
  return {
    name: 'telixon-engine-assets',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(serveEngineAsset);
    },
  };
}

export default defineConfig({
  resolve: {
    alias: CORE_ALIASES,
  },
  plugins: [createEngineAssetsPlugin()],
});
