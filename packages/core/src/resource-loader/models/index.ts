import { EngineLayerBytes } from '../../engine';

// Supplies the fully decoded engine layers (base64-decoded + gunzipped); decode strategy is the loader's concern.
export interface ResourceLoader {
  loadEngineBytes(): Promise<EngineLayerBytes>;
}

// A loader whose bytes are local (statically imported, in-bundle) and therefore decode synchronously; the on-demand channel has no sync path.
export interface SyncResourceLoader {
  loadEngineBytesSync(): EngineLayerBytes;
}
