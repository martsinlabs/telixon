// Pulls the EMBEDDED-module ambient types into every compilation that imports this file (incl. consumers).
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./engine-embedded-modules.d.ts" />
// Dynamic engine modules: one literal dynamic import per module (kept external so the host bundler code-splits the chunks); each default export maps layer keys to base64 of gzipped bytes.
export const DYNAMIC_ENGINE_MODULES: Readonly<
  Record<string, () => Promise<{ default: Readonly<Record<string, string>> }>>
> = {
  'walk.bin.js': () => import('./engine/embedded/walk.bin.js'),
  'verdict.bin.js': () => import('./engine/embedded/verdict.bin.js'),
  'scope.bin.js': () => import('./engine/embedded/scope.bin.js'),
  'metadata.bin.js': () => import('./engine/embedded/metadata.bin.js'),
};
