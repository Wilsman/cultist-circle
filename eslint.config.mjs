import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

const config = [
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    name: "cultist-circle/customizations",
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
  },
  {
    name: "cultist-circle/ignores",
    ignores: [
      ".next/**",
      "tests/**",
      "**/*.test.ts",
      "**/*.test.tsx",
      "**/__tests__/**",
      "next-env.d.ts",
      "vitest.config.ts",
      "tests/setup.ts",
    ],
  },
];

export default config;
