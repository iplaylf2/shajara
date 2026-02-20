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
    "eslint/default-case": "off",
    "eslint/func-style": ["error", "declaration", { allowArrowFunctions: true }],
    "eslint/max-params": ["error", { max: 4 }],
    "eslint/no-duplicate-imports": ["error", { allowSeparateTypeImports: true }],
    "eslint/no-ternary": "off",
    "eslint/no-use-before-define": "off",
    "import/exports-last": "off",
    "import/group-exports": "off",
    "import/no-default-export": "off",
    "import/no-named-export": "off",
    "import/prefer-default-export": "off",
  },
});
