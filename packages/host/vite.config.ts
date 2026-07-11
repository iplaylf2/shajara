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
    rollupOptions: {
      external: (id) => id.startsWith("@shajara/"),
    },
    target: "esnext",
  },
  plugins: [
    dts({
      entryRoot: "src",
      outDir: "dist",
      tsconfigPath: "./tsconfig.json",
    }),
  ],
  resolve: {
    alias: {
      "#test": new globalThis.URL("./test", import.meta.url).pathname,
    },
  },
  test: {
    coverage: { exclude: ["test/**"] },
    environment: "node",
    include: ["test/**/*.test.ts"],
    setupFiles: ["./test/setup/polyfills.ts"],
  },
});
