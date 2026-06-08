export class TelixonNotReadyError extends Error {
  readonly name = 'TelixonNotReadyError';

  constructor() {
    super(
      [
        'Telixon engine resources are not loaded.',
        '',
        'Call `await ensureReady()` once at startup before any other API:',
        '',
        "  import { ensureReady, parsePhoneNumber } from '@telixon/core';",
        '  await ensureReady();',
        "  parsePhoneNumber('+14155552671');",
        '',
        'Docs: https://github.com/martsinlabs/telixon/blob/main/docs/initialization.md',
      ].join('\n'),
    );
  }
}
