import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { gunzipSync } from 'node:zlib';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { ResourceLoader } from './models';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const resolvedBasePath: string = existsSync(join(__dirname, 'engine')) ? __dirname : join(__dirname, '..');

export class NodeResourceLoader implements ResourceLoader {
  private basePath = resolvedBasePath;

  async load(path: string): Promise<ArrayBuffer> {
    const fullPath: string = join(this.basePath, `${path}.gz`);
    const compressed: Buffer = await readFile(fullPath);
    const buffer: Buffer = gunzipSync(compressed);

    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
  }
}
