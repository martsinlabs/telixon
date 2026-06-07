import { ResourceLoader } from './models';

export class WebResourceLoader implements ResourceLoader {
  async load(path: string): Promise<ArrayBuffer> {
    const response: Response = await fetch(`${path}.gz`);
    if (!response.ok) throw new Error(`Failed to load ${path}.gz: ${response.status}`);
    const stream: ReadableStream<Uint8Array> = response.body!.pipeThrough(new DecompressionStream('gzip'));
    return new Response(stream).arrayBuffer();
  }
}
