import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  {
    ignores: [
      "**/dist/**",
      "**/build/**",
      "**/coverage/**",
      "**/node_modules/**",
      "**/*.min.*",
      "**/*.generated.*",
      "**/*.d.ts",
      "**/*.bak_*",
      "**/.eslintrc.cjs",
      "**/.lintstagedrc.cjs",
      "**/_trash_*/**",
      "**/_trash_src_app_*/**",
      ]
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Browser app code
  {
    files: ["src/**/*.{js,jsx,ts,tsx}"],
    plugins: {
      "react-hooks": reactHooks
    },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser
      }
    },
    rules: {
      
      "no-empty": "warn",...reactHooks.configs.recommended.rules,

      
      "react-hooks/preserve-manual-memoization": "warn",// Current codebase reality: keep progress moving
      "@typescript-eslint/no-explicit-any": "warn",

      // Allow common expression patterns used in TS/React code
      "@typescript-eslint/no-unused-expressions": ["error", {
        allowShortCircuit: true,
        allowTernary: true,
        allowTaggedTemplates: true
      }],

      // TS handles identifier checks better than ESLint in TS files
      "no-undef": "off"
    }
  },

  // Node/server scripts
  {
    files: ["server/**/*.{js,cjs,mjs,ts}", "*.config.{js,cjs,mjs,ts}", "scripts/**/*.{js,cjs,mjs,ts}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node
      }
    },
    rules: {
      
      "no-empty": "warn","no-undef": "off",
      "@typescript-eslint/no-require-imports": "off"
    }
  }
];

