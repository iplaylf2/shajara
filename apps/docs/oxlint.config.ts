import { defineConfig } from "oxlint";
import shared from "@shajara/presets/oxlint.shared.ts";

export default defineConfig({
  extends: [shared],
  overrides: [
    {
      files: ["src/**/*.astro"],
      rules: {
        "eslint/no-undef": "off",
        "import/consistent-type-specifier-style": "off",
        "import/unambiguous": "off",
        "typescript/explicit-module-boundary-types": "off",
        "unicorn/prefer-module": "off",
      },
    },
  ],
});
