module.exports = {
  env: {
    node: true,
    es2022: true,
  },
  extends: ["eslint:recommended", "prettier"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
  },
  plugins: ["@typescript-eslint", "prettier"],
  rules: {
    "prettier/prettier": "error",
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "no-console": "off", // Allow console.log in backend services
    "prefer-const": "error",
    "no-var": "error",
  },
  ignorePatterns: ["node_modules/", "dist/", "*.config.js"],
};
