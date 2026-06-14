import { ENGINE_MODULES, EngineLayerBytes } from '../engine';
import { decodeBase64 } from '../utils/decode-base64';
import { gunzipSync } from '../utils/gunzip';
import { retryAsync } from '../utils/retry-async';
import { WEB_ENGINE_MODULES } from '../web-engine-modules';
import { ResourceLoader } from './models';

// A transient network failure on a chunk should not kill the load: retry the import a few times (a browser-cached failed fetch can't recover; it surfaces through ensureEngineReady).
const IMPORT_ATTEMPTS = 3;
const IMPORT_RETRY_BASE_DELAY_MS = 200;

// Native base64 (Uint8Array.fromBase64) where present, else pure-JS decode (~0.7 ms for the whole engine); both beat atob + Uint8Array.from.
type Base64Native = { fromBase64?(base64: string): Uint8Array<ArrayBuffer> };
const fromBase64: Base64Native['fromBase64'] = (Uint8Array as unknown as Base64Native).fromBase64;
function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  return fromBase64 ? fromBase64.call(Uint8Array, base64) : decodeBase64(base64);
}

// Native gunzip via DecompressionStream runs the inflate off the main thread; falls back to the pure-JS sync decoder where the API is absent.
async function decodeLayer(base64: string): Promise<ArrayBuffer> {
  const gzipped: Uint8Array<ArrayBuffer> = base64ToBytes(base64);
  if (typeof DecompressionStream === 'undefined') return gunzipSync(gzipped).buffer;
  const inflated: ReadableStream<Uint8Array> = new Response(gzipped).body!.pipeThrough(new DecompressionStream('gzip'));
  return new Response(inflated).arrayBuffer();
}

// Loads the EMBEDDED channel: imports each engine module (a code-split chunk over the network), then decodes its layers; the network step can't be synchronous, so no sync channel.
export class WebResourceLoader implements ResourceLoader {
  async loadEngineBytes(): Promise<EngineLayerBytes> {
    const bytes: Record<string, ArrayBuffer> = {};
    await Promise.all(
      ENGINE_MODULES.map(async ({ file }) => {
        const importer = WEB_ENGINE_MODULES[file];
        if (!importer) throw new Error(`No embedded engine module for ${file}`);
        const payload = (await retryAsync(importer, IMPORT_ATTEMPTS, IMPORT_RETRY_BASE_DELAY_MS)).default;
        await Promise.all(
          Object.keys(payload).map(async (layerKey) => {
            bytes[layerKey] = await decodeLayer(payload[layerKey]!);
          }),
        );
      }),
    );
    return bytes as unknown as EngineLayerBytes;
  }
}
