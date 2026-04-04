export function extractDigits(value: string, maxLength?: number): string[] {
  const valueLength: number = value.length;
  const limit: number = maxLength !== undefined ? maxLength : valueLength;

  const result: Array<string> = new Array(limit);
  let count = 0;

  for (let i = 0; i < valueLength; i++) {
    const code: number = value.charCodeAt(i);

    if (code < 48 || code > 57) continue;

    result[count++] = value[i]!;

    if (count === limit) break;
  }

  result.length = count;
  return result;
}
