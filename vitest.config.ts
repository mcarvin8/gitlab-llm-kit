import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@src\/(.+)\.js$/, replacement: path.resolve(rootDir, "src/$1.ts") },
      { find: /^@src\/(.+)$/, replacement: path.resolve(rootDir, "src/$1") },
    ],
  },
  test: {
    globals: true,
    environment: "node",
    include: ["test/**/*.{spec,test}.ts", "test/**/*.{spec,test}.tsx"],
    reporters: ["verbose"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/index.ts", "src/insights/**", "src/integrations/**"],
      thresholds: {
        branches: 75,
        functions: 75,
        lines: 75,
        statements: 75,
      },
    },
  },
});
