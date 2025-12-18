import { expect, test } from "bun:test";

test("vitest suite passes", () => {
  const result = Bun.spawnSync({
    cmd: ["bun", "run", "test"],
    stdout: "inherit",
    stderr: "inherit",
  });
  expect(result.exitCode).toBe(0);
});
