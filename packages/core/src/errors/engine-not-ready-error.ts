/**
 * Thrown by any API call made before {@link ensureEngineReady} (or `ensureEngineReadySync`) has
 * loaded the engine. Once it is loaded, the query and controller APIs throw nothing.
 */
export class EngineNotReadyError extends Error {
  readonly name = 'EngineNotReadyError';

  constructor() {
    super(
      [
        'Telixon engine is not initialized.',
        '',
        'Initialization is explicit. Call ensureEngineReady() before the first API call:',
        '',
        "  import { ensureEngineReady, parsePhoneNumber } from '@telixon/core';",
        '  await ensureEngineReady();',
        "  parsePhoneNumber('+12015550123');",
        '',
        "For synchronous initialization, import ensureEngineReadySync from '@telixon/core/sync-init'.",
        '',
        'Docs: https://telixon.dev/core/load-the-engine/',
      ].join('\n'),
    );
  }
}
