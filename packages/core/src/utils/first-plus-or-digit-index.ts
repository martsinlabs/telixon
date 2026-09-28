import { isDigitCharCode } from './digit-value';

// The index of the first plus or digit, or -1. A clipboard carries labels, link schemes, quotes,
// marks and emoji before the number itself; the fullwidth plus counts as a plus.
export function firstPlusOrDigitIndex(input: string): number {
  for (let index = 0; index < input.length; index++) {
    const code: number = input.charCodeAt(index);
    if (code === 0x2b || code === 0xff0b || isDigitCharCode(code)) return index;
  }
  return -1;
}
