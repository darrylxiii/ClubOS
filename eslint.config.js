import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import jsxA11y from "eslint-plugin-jsx-a11y";
import tseslint from "typescript-eslint";
import i18nNoRawJsxText from "./eslint-rules/no-raw-jsx-text.mjs";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      "jsx-a11y": jsxA11y,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],

      // Phase 1: Stricter TypeScript rules
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/explicit-function-return-type": "off", // Enable in Phase 2

      // Accessibility rules (jsx-a11y) - warn initially to avoid blocking builds
      ...jsxA11y.configs.recommended.rules,
      "jsx-a11y/alt-text": "warn",
      "jsx-a11y/anchor-is-valid": "warn",
      "jsx-a11y/click-events-have-key-events": "warn",
      "jsx-a11y/no-static-element-interactions": "warn",
    },
  },
  // i18n: no new raw user-visible copy in JSX — use t() / Trans (warn = visible in IDE & lint-staged without blocking legacy debt)
  {
    files: ["src/**/*.tsx"],
    ignores: [
      "src/components/ui/**",
      "src/**/*.test.tsx",
      "src/**/__tests__/**",
      "tests/**",
      "src/pages/legal/**",
    ],
    plugins: {
      i18n: {
        rules: {
          "no-raw-jsx-text": i18nNoRawJsxText,
        },
      },
    },
    rules: {
      "i18n/no-raw-jsx-text": [
        "warn",
        {
          // Punctuation / numeric-only snippets (not prose)
          ignorePattern: "^[+\\-*/|%$€£.,:;·\\s\\d]+$",
        },
      ],
    },
  },
  // Relaxed rules for test files
  {
    files: ["tests/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
);
