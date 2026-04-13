import { defineConfig } from "oxlint";
import shared from "@shajara/presets/oxlint.shared.ts";
import testShared from "@shajara/presets/test.oxlint.shared.ts";

export default defineConfig({
  extends: [shared],
  overrides: [
    {
      files: ["test/**/*.ts"],
      rules: { ...testShared, "eslint/require-yield": "off" },
    },
  ],
});
