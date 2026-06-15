import { decodeBase64 } from '../utils/decode-base64';
import { gunzipSync } from '../utils/gunzip';

// Native base64 (Uint8Array.fromBase64) where present, else pure-JS decode (~0.7 ms for the whole engine); both beat atob + Uint8Array.from.
type Base64Native = { fromBase64?(base64: string): Uint8Array<ArrayBuffer> };
const fromBase64: Base64Native['fromBase64'] = (Uint8Array as unknown as Base64Native).fromBase64;
function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  return fromBase64 ? fromBase64.call(Uint8Array, base64) : decodeBase64(base64);
}

// DecompressionStream runs the inflate off the main thread (web, edge, Node 18+); falls back to the pure-JS sync decoder where the API is absent.
export async function decodeLayerStream(base64: string): Promise<ArrayBuffer> {
  const gzipped: Uint8Array<ArrayBuffer> = base64ToBytes(base64);
  if (typeof DecompressionStream === 'undefined') return gunzipSync(gzipped).buffer;
  const inflated: ReadableStream<Uint8Array> = new Response(gzipped).body!.pipeThrough(new DecompressionStream('gzip'));
  return new Response(inflated).arrayBuffer();
}
