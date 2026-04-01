import { ResourceLoader } from "./models";

export class WebResourceLoader implements ResourceLoader {
  async load<T>(path: string): Promise<T> {
    return fetch(path) as Promise<T>;
  }
}
