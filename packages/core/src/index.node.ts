import { gunzipSync } from 'node:zlib';
import { EmbeddedResourceLoader } from './resource-loader/embedded-resource-loader';
import { setResourceLoader } from './resource-loader/resource-loader.config';

// Node decodes with native zlib (JIT-free, ~10x the pure-JS path cold); the exact-size copy hands parseEngine a standalone ArrayBuffer.
function decodeLayerNative(base64: string): ArrayBuffer {
  const decompressed: Buffer = gunzipSync(Buffer.from(base64, 'base64'));
  const buffer = new ArrayBuffer(decompressed.byteLength);
  new Uint8Array(buffer).set(decompressed);
  return buffer;
}

setResourceLoader(new EmbeddedResourceLoader(decodeLayerNative));

export * from './index';
