import { defineConfig } from "oxlint";

export default defineConfig({
  categories: {
    correctness: "error",
    nursery: "error",
    pedantic: "error",
    perf: "error",
    restriction: "error",
    style: "error",
    suspicious: "error",
  },
  plugins: ["import"],
  rules: {
    "eslint/no-duplicate-imports": "off",
    "eslint/func-style": ["error", "declaration", { allowArrowFunctions: true }],
    "eslint/no-ternary": "off",
    "import/no-default-export": "off",
    "import/no-named-export": "off",
    "import/prefer-default-export": "off",
  },
});
