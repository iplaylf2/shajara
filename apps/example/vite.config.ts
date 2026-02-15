import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: "src/main.ts",
      fileName: () => "main.js",
      formats: ["es"],
    },
    minify: false,
    sourcemap: true,
    target: "node24",
  },
});
