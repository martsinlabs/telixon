import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    "index.browser": "src/index.browser.ts",
    "index.node": "src/index.node.ts",
  },
  format: ["esm"],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: false,
});
