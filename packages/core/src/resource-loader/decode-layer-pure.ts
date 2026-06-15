import { decodeBase64 } from '../utils/decode-base64';
import { gunzipSync } from '../utils/gunzip';

// Universal sync decode: pure-JS base64 + gunzip, runs in any runtime. The floor where neither node:zlib nor a sync DecompressionStream exists (edge global scope), and the default for EmbeddedResourceLoader.
export function decodeLayerPure(base64: string): ArrayBuffer {
  return gunzipSync(decodeBase64(base64)).buffer;
}
