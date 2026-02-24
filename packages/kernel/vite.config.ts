import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: "src/index.ts",
        primitives: "src/primitives/index.ts",
        "primitives-kit": "src/primitives-kit/index.ts",
      },
      fileName: (format, entryName) => (format === "es" ? `${entryName}.js` : `${entryName}.cjs`),
      formats: ["es", "cjs"],
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
});
