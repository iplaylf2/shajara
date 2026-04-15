import { defineConfig } from "oxlint";
import shared from "@shajara/presets/oxlint.shared.ts";

export default defineConfig({
  extends: [shared],
  rules: {
    "eslint/max-lines": "off",
    "eslint/max-lines-per-function": "off",
    "eslint/max-statements": "off",
    "eslint/no-await-in-loop": "off",
    "eslint/no-console": "off",
    "eslint/no-magic-numbers": "off",
    "eslint/no-undef": "off",
    "import/no-nodejs-modules": "off",
    "unicorn/no-process-exit": "off",
  },
});
