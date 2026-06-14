export class TelixonNotReadyError extends Error {
  readonly name = 'TelixonNotReadyError';

  constructor() {
    super(
      [
        'Telixon engine resources are still loading.',
        '',
        'The engine chunks start downloading in the background when the library is imported.',
        'To guarantee readiness before first use, await the preload once:',
        '',
        "  import { ensureEngineReady, parsePhoneNumber } from '@telixon/core';",
        '  await ensureEngineReady();',
        "  parsePhoneNumber('+12015550123');",
        '',
        'Docs: https://github.com/martsinlabs/telixon/blob/main/docs/initialization.md',
      ].join('\n'),
    );
  }
}
