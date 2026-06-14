import { EngineLayerBytes } from '../../engine';

// Supplies the fully decoded engine layers (base64-decoded + gunzipped); decode strategy is the loader's concern. loadEngineBytesSync exists only for the local byte channel, not the network one.
export interface ResourceLoader {
  loadEngineBytes(): Promise<EngineLayerBytes>;
  loadEngineBytesSync?(): EngineLayerBytes;
}
