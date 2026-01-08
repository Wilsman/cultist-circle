import js from "@eslint/js";
import typescript from "@typescript-eslint/eslint-plugin";
import typescriptParser from "@typescript-eslint/parser";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";

const config = [
  js.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        module: "readonly",
        require: "readonly",
        exports: "readonly",
        global: "readonly",
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        localStorage: "readonly",
        sessionStorage: "readonly",
        fetch: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        KeyboardEvent: "readonly",
        HTMLElement: "readonly",
        EventListener: "readonly",
        Blob: "readonly",
        URL: "readonly",
        Image: "readonly",
        CanvasRenderingContext2D: "readonly",
        CanvasImageSource: "readonly",
        createImageBitmap: "readonly",
        HTMLImageElement: "readonly",
        HTMLButtonElement: "readonly",
        ClipboardItem: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": typescript,
      react,
      "react-hooks": reactHooks,
    },
    rules: {
      ...typescript.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  },
  {
    name: "cultist-circle/ignores",
    ignores: [
      "dist/**",
      "build/**",
      ".next/**",
      "node_modules/**",
      "coverage/**",
      "tests/**",
      "**/*.test.ts",
      "**/*.test.tsx",
      "**/__tests__/**",
      "vitest.config.ts",
      "tests/setup.ts",
      "*.config.js",
      "*.config.mjs",
      "*.config.ts",
    ],
  },
];

export default config;
