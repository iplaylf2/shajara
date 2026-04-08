import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import license from "vite-plugin-license";

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: "src/index.ts",
        sigils: "src/sigils.ts",
        utils: "src/utils.ts",
      },
      fileName: (format, entryName) => (format === "es" ? `${entryName}.js` : `${entryName}.cjs`),
      formats: ["es", "cjs"],
    },
    target: "esnext",
  },
  plugins: [
    license({
      thirdParty: {
        output: "dist/THIRD_PARTY_LICENSES.txt",
      },
    }),
    dts({
      entryRoot: "src",
      outDir: "dist",
      tsconfigPath: "./tsconfig.json",
    }),
  ],
});
