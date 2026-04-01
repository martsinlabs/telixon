export interface ResourceLoader {
  load<T>(path: string): Promise<T>;
}
