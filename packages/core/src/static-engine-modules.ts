// Pulls the EMBEDDED-module ambient types into every compilation that imports this file (incl. consumers).
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./engine-embedded-modules.d.ts" />
// EMBEDDED channel, static: engine modules ship in the deployed script (Node, edge), so payloads are local at eval and init is synchronous.
import metadata from './engine/embedded/metadata.bin.js';
import scope from './engine/embedded/scope.bin.js';
import verdict from './engine/embedded/verdict.bin.js';
import walk from './engine/embedded/walk.bin.js';

export const STATIC_ENGINE_MODULES: ReadonlyArray<Readonly<Record<string, string>>> = [walk, verdict, scope, metadata];
