import type { PhoneInputElement } from '../models';

export function assertTextInputType(input: PhoneInputElement): void {
  if (input.type === 'text') return;

  throw new Error(`@telixon/web-sdk requires an <input type="text"> element, received type="${input.type}".`);
}
