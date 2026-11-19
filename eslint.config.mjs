import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

export default [
  { ignores: ["templates/**", ".next/**", "node_modules/**"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // Server actions receive the previous form state first; an underscore
    // marks a parameter the signature requires but the body doesn't use.
    rules: { "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }] },
  },
];
