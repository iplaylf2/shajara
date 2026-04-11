import type { OxlintOverride } from "oxlint";

export default {
  files: ["test/**/*.ts"],
  rules: {
    "eslint/max-lines": "off",
    "eslint/max-lines-per-function": "off",
    "eslint/max-params": "off",
    "eslint/max-statements": "off",
    "eslint/no-magic-numbers": "off",
    "eslint/no-undefined": "off",
    "eslint/require-await": "off",
  },
} satisfies OxlintOverride;
