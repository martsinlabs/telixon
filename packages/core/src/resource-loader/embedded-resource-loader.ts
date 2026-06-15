import { EngineLayerBytes } from '../engine';
import { STATIC_ENGINE_MODULES } from '../static-engine-modules';
import { decodeLayerPure } from './decode-layer-pure';
import { SyncResourceLoader } from './models';

// Static, synchronous: the engine modules are statically imported (present in the deployed bundle), so payloads exist at eval and decode runs in-process; decode is injected (Node native zlib, edge/web pure-JS).
export class EmbeddedResourceLoader implements SyncResourceLoader {
  constructor(private readonly decodeLayer: (base64: string) => ArrayBuffer = decodeLayerPure) {}

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
