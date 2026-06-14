import { EngineLayerBytes } from '../engine';
import { STATIC_ENGINE_MODULES } from '../static-engine-modules';
import { decodeBase64 } from '../utils/decode-base64';
import { gunzipSync } from '../utils/gunzip';
import { ResourceLoader } from './models';

// Default sync decode: pure-JS base64 + gunzip, runs in any runtime (used on edge, where neither node:zlib nor a sync DecompressionStream exists).
function decodeLayerPure(base64: string): ArrayBuffer {
  return gunzipSync(decodeBase64(base64)).buffer;
}

// EMBEDDED over static imports: modules ship in the deployed script (Node, edge), so payloads are local and init is synchronous; decode is injected (Node native zlib, edge pure-JS).
export class EmbeddedResourceLoader implements ResourceLoader {
  constructor(private readonly decodeLayer: (base64: string) => ArrayBuffer = decodeLayerPure) {}

  async loadEngineBytes(): Promise<EngineLayerBytes> {
    return this.decodeAllLayers();
  }

  loadEngineBytesSync(): EngineLayerBytes {
    return this.decodeAllLayers();
  }

  private decodeAllLayers(): EngineLayerBytes {
    const bytes: Record<string, ArrayBuffer> = {};
    for (const payload of STATIC_ENGINE_MODULES) {
      for (const layerKey of Object.keys(payload)) bytes[layerKey] = this.decodeLayer(payload[layerKey]!);
    }
    return bytes as unknown as EngineLayerBytes;
  }
}
