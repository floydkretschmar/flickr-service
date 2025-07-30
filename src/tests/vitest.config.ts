import { coverageConfigDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: ["**/node_modules/**", "**/build/**"],
    coverage: {
      extension: ["ts"],
      thresholds: {
        functions: 90,
        lines: 80,
      },
    },
  },
});
