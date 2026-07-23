/// <reference types="vitest/config" />
import { defineConfig } from "vitest/config";

export default defineConfig({
  root: ".",
  base: "./",
  build: {
    target: "es2022",
    outDir: "dist",
    sourcemap: true,
  },
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
});
