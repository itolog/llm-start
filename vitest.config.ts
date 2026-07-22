import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      // Match the tsconfig "@/*" -> "./src/*" path alias. The regex boundary
      // keeps scoped packages (@langchain/*, @testing-library/*) untouched.
      "@/": fileURLToPath(new URL("./src/", import.meta.url)),
    },
  },
  test: {
    // Ink tests assert on raw frame text; callers like concurrently (verify) and
    // IDE runners inject FORCE_COLOR, which would wrap frames in ANSI codes.
    // Force color off so frames are byte-identical regardless of the caller.
    env: { FORCE_COLOR: "0" },
    include: ["src/**/*.test.ts"],
    exclude: ["dist/**"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.ts",
        "src/**/*.type.ts",
        "src/**/index.ts",
        "src/index.tsx",
        "src/stubs/**",
        // Presentational Ink views: no branching logic, exercised through the
        // hook tests. Component-level rendering tests are tracked separately.
        "src/**/*.component.tsx",
        // Static ChatPromptTemplate (no logic); unit tests mock it, so it never
        // executes under coverage.
        "src/services/llm-model/llm-prompt.ts",
      ],
      // Regression floor — keep it just under the current logic-layer coverage
      // so the suite fails if coverage drops, without churn on tiny swings.
      thresholds: {
        statements: 90,
        branches: 85,
        functions: 85,
        lines: 90,
      },
    },
  },
});
