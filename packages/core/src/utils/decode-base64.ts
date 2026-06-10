const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const BASE64_PADDING = 61; // '='

const BASE64_LOOKUP: Uint8Array = (() => {
  const table = new Uint8Array(128);
  for (let index = 0; index < BASE64_ALPHABET.length; index++) table[BASE64_ALPHABET.charCodeAt(index)] = index;
  return table;
})();

// Pure-JS standard base64 decode (no `atob`/`Buffer`): runs on any JS runtime. Expects padded base64.
export function decodeBase64(base64: string): Uint8Array<ArrayBuffer> {
  const length: number = base64.length;
  let padding = 0;
  if (length > 0 && base64.charCodeAt(length - 1) === BASE64_PADDING) padding++;
  if (length > 1 && base64.charCodeAt(length - 2) === BASE64_PADDING) padding++;

  const byteLength: number = (length >> 2) * 3 - padding;
  const bytes = new Uint8Array(byteLength);

  let position = 0;
  for (let index = 0; index < length; index += 4) {
    const a = BASE64_LOOKUP[base64.charCodeAt(index)]!;
    const b = BASE64_LOOKUP[base64.charCodeAt(index + 1)]!;
    const c = BASE64_LOOKUP[base64.charCodeAt(index + 2)]!;
    const d = BASE64_LOOKUP[base64.charCodeAt(index + 3)]!;
    bytes[position++] = (a << 2) | (b >> 4);
    if (position < byteLength) bytes[position++] = ((b & 15) << 4) | (c >> 2);
    if (position < byteLength) bytes[position++] = ((c & 3) << 6) | d;
  }
  return bytes;
}
