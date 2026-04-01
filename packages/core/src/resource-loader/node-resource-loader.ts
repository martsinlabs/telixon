import { readFile } from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { ResourceLoader } from "./models";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class NodeResourceLoader implements ResourceLoader {
  private basePath = join(__dirname, "..");

  async load<T>(path: string): Promise<T> {
    const fullPath: string = join(this.basePath, path);
    return readFile(fullPath, "utf-8") as Promise<T>;
  }
}
