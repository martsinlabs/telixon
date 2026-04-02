export interface ResourceLoader {
  load(path: string): Promise<ArrayBuffer>;
}
