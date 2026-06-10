import { decodeBase64 } from '../utils/decode-base64';
import { gunzip } from '../utils/gunzip';
import { WEB_EMBEDDED_ARTIFACTS } from '../web-embedded-artifacts';
import { ResourceLoader } from './models';

// Loads the EMBEDDED channel: imports the artifact's base64 module, then decodes + gunzips it.
export class WebResourceLoader implements ResourceLoader {
  async load(path: string): Promise<ArrayBuffer> {
    const artifact = WEB_EMBEDDED_ARTIFACTS[path];
    if (!artifact) throw new Error(`No embedded engine artifact for ${path}`);

    const { default: base64 } = await artifact();
    const raw: Uint8Array = await gunzip(decodeBase64(base64));
    return raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength) as ArrayBuffer;
  }
}
