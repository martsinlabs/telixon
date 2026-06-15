import { promisify } from 'node:util';
import * as zlib from 'node:zlib';

const gunzipAsync = promisify(zlib.gunzip);

// The exact-size copy hands parseEngine a standalone ArrayBuffer (not a view over a larger pool).
function toArrayBuffer(decompressed: Buffer): ArrayBuffer {
  const buffer = new ArrayBuffer(decompressed.byteLength);
  new Uint8Array(buffer).set(decompressed);
  return buffer;
}

// Node sync decode: native zlib (JIT-free, ~10x the pure-JS path cold).
export function decodeLayerNative(base64: string): ArrayBuffer {
  return toArrayBuffer(zlib.gunzipSync(Buffer.from(base64, 'base64')));
}

// Node async decode: native zlib off the libuv threadpool, so the engine inflates without blocking the event loop.
export async function decodeLayerNativeAsync(base64: string): Promise<ArrayBuffer> {
  return toArrayBuffer(await gunzipAsync(Buffer.from(base64, 'base64')));
}
