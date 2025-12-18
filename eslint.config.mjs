import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const config = [
  ...nextCoreWebVitals,
  ...nextTypescript,
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
