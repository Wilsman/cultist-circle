import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory: __dirname });

const config = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    name: "cultist-circle/customizations",
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
  },
  {
    name: "cultist-circle/ignores",
    ignores: [
      "tests/**",
      "**/*.test.ts",
      "**/*.test.tsx",
      "**/__tests__/**",
      "vitest.config.ts",
      "tests/setup.ts",
    ],
  },
];

export default config;
