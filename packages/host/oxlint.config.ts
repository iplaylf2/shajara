import { defineConfig } from "oxlint";
import shared from "@shajara/presets/oxlint.shared.ts";
import testOverride from "@shajara/presets/test.oxlint.override.ts";

export default defineConfig({
  ...shared,
  overrides: [testOverride],
});
