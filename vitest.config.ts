import { defineConfig } from "vitest/config";
import path from "path";
import JSON5 from "json5";

const json5Plugin = () => ({
  name: "json5",
  transform(code: string, id: string) {
    if (!id.endsWith(".json5")) return null;
    const parsed = JSON5.parse(code);
    return {
      code: `export default ${JSON.stringify(parsed)};`,
      map: null,
    };
  },
});

export default defineConfig({
  plugins: [json5Plugin()],
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    globals: true,
    css: false,
    include: ["tests/**/*.test.{ts,tsx}"],
    restoreMocks: true,
    clearMocks: true,
    mockReset: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
