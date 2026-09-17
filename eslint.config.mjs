import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      // Compiler output from `npm run verify`. .gitignore already excludes it;
      // eslint did not, so `npm run lint` failed on generated JavaScript
      // whenever the verify suites had been run first.
      ".verify/**",
      // The vendored copy of @platform/client-core. It is a dependency that
      // happens to live in the repo, not source of this app — it is authored,
      // built and linted in platform-client-core.
      "vendor/**",
    ],
  },
];

export default eslintConfig;
