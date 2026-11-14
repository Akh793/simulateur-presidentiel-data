import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { zod: fileURLToPath(new URL("./node_modules/zod", import.meta.url)) } },
  test: { include: ["tests/**/*.test.ts"], testTimeout: 180_000, pool: "forks" },
});
