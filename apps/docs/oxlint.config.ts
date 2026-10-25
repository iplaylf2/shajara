import { defineConfig } from "oxlint";
import shared from "@shajara/presets/oxlint.shared.ts";

export default defineConfig({
  extends: [shared],
  overrides: [
    {
      files: ["src/**/*.astro"],
      globals: {
        Astro: "readonly",
      },
      rules: {
        "typescript/explicit-module-boundary-types": "off",
        "unicorn/prefer-module": "off",
      },
    },
    {
      env: {
        node: true,
      },
      files: ["typedoc.config.mjs"],
      rules: {
        "import/no-nodejs-modules": "off",
      },
    },
  ],
});
