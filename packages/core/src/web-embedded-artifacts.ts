// Pulls the EMBEDDED-module ambient types into every compilation that imports this file (incl. consumers).
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./engine-embedded-modules.d.ts" />
// EMBEDDED channel: one literal dynamic import per artifact, pointing at the shipped
// `engine/embedded/<artifact>.js` modules (kept external from this bundle so the host bundler
// code-splits the real files). Each module's default export is the base64 of the gzipped bytes.
// Paths are relative to the emitted bundle (engine ships next to it); keys match the resolver keys.
export const WEB_EMBEDDED_ARTIFACTS: Readonly<Record<string, () => Promise<{ default: string }>>> = {
  'dfa/graph.bin': () => import('./engine/embedded/dfa/graph.bin.js'),
  'dfa/calling-codes.bin': () => import('./engine/embedded/dfa/calling-codes.bin.js'),
  'dfa/country-scope.bin': () => import('./engine/embedded/dfa/country-scope.bin.js'),
  'dfa/number-type-scope.bin': () => import('./engine/embedded/dfa/number-type-scope.bin.js'),
  'dfa/number-type-profile.bin': () => import('./engine/embedded/dfa/number-type-profile.bin.js'),
  'metadata/formats.json': () => import('./engine/embedded/metadata/formats.json.js'),
  'metadata/territories.json': () => import('./engine/embedded/metadata/territories.json.js'),
  'metadata/reference-mapping.json': () => import('./engine/embedded/metadata/reference-mapping.json.js'),
};
