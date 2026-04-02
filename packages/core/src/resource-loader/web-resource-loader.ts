import { ResourceLoader } from "./models";

export class WebResourceLoader implements ResourceLoader {
  async load(path: string): Promise<ArrayBuffer> {
    return fetch(path).then((response: Response) => response.arrayBuffer());
  }
}
