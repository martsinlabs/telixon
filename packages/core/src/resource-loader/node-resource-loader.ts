import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { gunzipSync } from 'node:zlib';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { ENGINE_LAYOUT } from '../engine';
import { ResourceLoader } from './models';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const resolvedBasePath: string = existsSync(join(__dirname, ENGINE_LAYOUT.ROOT)) ? __dirname : join(__dirname, '..');

// Reads the RAW channel from disk: `engine/raw/<key>.gz`, gunzipped.
export class NodeResourceLoader implements ResourceLoader {
  private basePath = resolvedBasePath;

  async load(path: string): Promise<ArrayBuffer> {
    const fullPath: string = join(
      this.basePath,
      ENGINE_LAYOUT.ROOT,
      ENGINE_LAYOUT.RAW.FOLDER,
      `${path}${ENGINE_LAYOUT.COMPRESSION.EXT}`,
    );
    const compressed: Buffer = await readFile(fullPath);
    const buffer: Buffer = gunzipSync(compressed);

    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
  }
}
