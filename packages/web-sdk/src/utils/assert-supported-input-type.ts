import type { PhoneInputElement } from '../models';

export function assertSupportedInputType(input: PhoneInputElement): void {
  if (input.type === 'text' || input.type === 'tel') return;

  throw new Error(
    `@telixon/web-sdk requires an <input type="text"> or <input type="tel"> element, received type="${input.type}".`,
  );
}
