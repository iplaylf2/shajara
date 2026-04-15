import { defineConfig } from "oxlint";
import shared from "@shajara/presets/oxlint.shared.ts";

export default defineConfig({
  env: {
    node: true,
  },
  extends: [shared],
  rules: {
    "eslint/max-lines": "off",
    "import/no-nodejs-modules": "off",
  },
});
