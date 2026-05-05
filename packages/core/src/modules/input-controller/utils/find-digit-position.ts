export function findPreviousDigitPosition(value: string, from: number): number {
  for (let i = from - 1; i >= 0; i--) {
    const code: number = value.charCodeAt(i) - 48;
    if (code >= 0 && code <= 9) return i;
  }
  return -1;
}

export function findNextDigitPosition(value: string, from: number): number {
  for (let i = from; i < value.length; i++) {
    const code: number = value.charCodeAt(i) - 48;
    if (code >= 0 && code <= 9) return i;
  }
  return -1;
}
