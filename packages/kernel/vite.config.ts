import { defineConfig } from "vitest/config";
import dts from "vite-plugin-dts";

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: "src/index.ts",
        sigils: "src/sigils.ts",
        utils: "src/utils.ts",
      },
      fileName: (_format, entryName) => `${entryName}.js`,
      formats: ["es"],
    },
    license: { fileName: "THIRD_PARTY_NOTICES.md" },
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
