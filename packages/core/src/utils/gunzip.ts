// Gunzips gzip bytes via the platform DecompressionStream (off-thread; browsers 2023+, Node 18+).
export async function gunzip(compressed: Uint8Array<ArrayBuffer>): Promise<Uint8Array> {
  const decompressor = new DecompressionStream('gzip');
  const writer = decompressor.writable.getWriter();
  void writer.write(compressed);
  void writer.close();
  return new Uint8Array(await new Response(decompressor.readable).arrayBuffer());
}
