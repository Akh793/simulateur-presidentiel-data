import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// shared/schema.ts vit hors du paquet : on lui fait résoudre zod depuis engine/node_modules.
export default defineConfig({
  resolve: { alias: { zod: fileURLToPath(new URL("./node_modules/zod", import.meta.url)) } },
  test: { include: ["tests/**/*.test.ts"], testTimeout: 120_000 },
});
