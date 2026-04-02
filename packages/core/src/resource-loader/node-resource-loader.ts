import { readFile } from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { ResourceLoader } from "./models";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class NodeResourceLoader implements ResourceLoader {
  private basePath = join(__dirname, "..");

  async load(path: string): Promise<ArrayBuffer> {
    const fullPath: string = join(this.basePath, path);
    const buffer: Buffer = await readFile(fullPath);

    return buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength
    );
  }
}
