// Engine EMBEDDED channel modules: each `engine/embedded/<artifact>.js` exports the base64 of the
// gzipped artifact bytes as its default export.
declare module '*.bin.js' {
  const base64: string;
  export default base64;
}

declare module '*.json.js' {
  const base64: string;
  export default base64;
}
