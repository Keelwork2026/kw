// ESLint flat config (`pnpm run lint`). `next lint` is deprecated and, with no
// config present, stops at an interactive prompt that automated checks can't answer.
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

const config = [
  { ignores: ["node_modules/**", ".next/**", ".open-next/**", ".wrangler/**", ".kw-bundle/**", ".keelwork/**", "out/**", "next-env.d.ts"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

export default config;
