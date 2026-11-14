import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Tests de la logique pure de l'application (sans React Native) : mise en page, échelles, synchronisation.
export default defineConfig({
  resolve: {
    alias: {
      zod: fileURLToPath(new URL("./node_modules/zod", import.meta.url)),
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: { include: ["tests/**/*.test.ts"], testTimeout: 120_000, pool: "forks" },
});
