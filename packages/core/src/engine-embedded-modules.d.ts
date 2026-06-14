// Engine EMBEDDED channel modules: each `engine/embedded/<file>.bin.js` default-exports layer keys to base64 of gzipped bytes.
declare module '*.bin.js' {
  const layers: Readonly<Record<string, string>>;
  export default layers;
}
