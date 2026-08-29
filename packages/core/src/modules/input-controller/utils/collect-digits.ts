/** Extracts the ASCII digits of a string in order. */
export function collectDigits(text: string): string {
  let digits = '';
  for (let index = 0; index < text.length; index++) {
    const charCode: number = text.charCodeAt(index);
    if (charCode >= 48 && charCode <= 57) digits += text[index];
  }
  return digits;
}
