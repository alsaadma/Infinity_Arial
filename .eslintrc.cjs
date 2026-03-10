module.exports = {
  root: true,

  // Base ignores (avoid linting build outputs / generated / vendor)
  ignorePatterns: [
    "dist",
    "build",
    "coverage",
    "node_modules",
    "*.bak_*",
    "**/*.min.*"
  ],

  overrides: [
    // ------------------------------
    // TS/TSX (app code)
    // ------------------------------
    {
      files: ["src/**/*.{ts,tsx}"],
      env: { browser: true, es2020: true },
      parser: "@typescript-eslint/parser",
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true }
        // NOTE: intentionally NOT using parserOptions.project yet
        // because it turns on type-aware rules and will explode the repo
      },
      plugins: ["@typescript-eslint", "react-hooks", "react-refresh", "prettier"],
      extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:react-hooks/recommended",
        "plugin:prettier/recommended"
      ],
      rules: {
        "prettier/prettier": "error",

        // Phase-1 pragmatism: allow patterns common in React UI code
        "@typescript-eslint/no-explicit-any": "warn",
        "@typescript-eslint/no-unused-expressions": "off",
        "no-unused-expressions": "off",
        "no-constant-condition": "off",
        "no-cond-assign": "warn",
        "no-fallthrough": "warn",
        "no-prototype-builtins": "warn",
        "no-useless-escape": "warn",

        // Prefer underscore for intentionally-unused vars
        "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }]
      }
    },

    // ------------------------------
    // Node/server JS (if you want it linted)
    // ------------------------------
    {
      files: ["server/**/*.js"],
      env: { node: true, es2020: true },
      rules: {
        // Don't force TS rules on plain JS
      }
    }
  ]
};
