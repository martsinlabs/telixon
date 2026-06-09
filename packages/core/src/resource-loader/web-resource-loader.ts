import { WEB_EMBEDDED_ARTIFACTS } from '../web-embedded-artifacts';
import { ResourceLoader } from './models';

// Loads the EMBEDDED channel: imports the artifact's base64 module, then decodes + gunzips it.
export class WebResourceLoader implements ResourceLoader {
  async load(path: string): Promise<ArrayBuffer> {
    const artifact = WEB_EMBEDDED_ARTIFACTS[path];
    if (!artifact) throw new Error(`No embedded engine artifact for ${path}`);

    const { default: base64 } = await artifact();
    // fetch on a data URL decodes base64 natively (off the main thread), then stream straight into gunzip.
    const response: Response = await fetch(`data:application/octet-stream;base64,${base64}`);
    const stream: ReadableStream<Uint8Array> = response.body!.pipeThrough(new DecompressionStream('gzip'));
    return new Response(stream).arrayBuffer();
  }
}
