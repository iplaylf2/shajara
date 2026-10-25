import { defineConfig } from "vitest/config";
import dts from "vite-plugin-dts";

export default defineConfig({
  build: {
    lib: {
      entry: {
        boundary: "src/boundary.ts",
        index: "src/index.ts",
        primitives: "src/primitives.ts",
      },
      fileName: (_format, entryName) => `${entryName}.js`,
      formats: ["es"],
    },
    rolldownOptions: {
      external: (id) => id.startsWith("@shajara/"),
    },
    target: "esnext",
  },
  plugins: [dts()],
  resolve: {
    alias: {
      "#test": new globalThis.URL("./test", import.meta.url).pathname,
    },
  },
  test: {
    coverage: { exclude: ["test/**"] },
    include: ["test/**/*.test.ts"],
  },
});
