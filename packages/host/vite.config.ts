import { defineConfig } from "vitest/config";
import dts from "vite-plugin-dts";

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: "src/index.ts",
        primitives: "src/primitives.ts",
      },
      fileName: (format, entryName) => (format === "es" ? `${entryName}.js` : `${entryName}.cjs`),
      formats: ["es", "cjs"],
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
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
});
