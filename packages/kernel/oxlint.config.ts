import { defineConfig } from "oxlint";
import shared from "@shajara/presets/oxlint.shared.ts";

export default defineConfig({
  ...shared,
  overrides: [
    {
      files: ["test/**/*.ts"],
      rules: {
        "eslint/max-lines-per-function": "off",
        "eslint/no-undefined": "off",
      },
    },
  ],
});
