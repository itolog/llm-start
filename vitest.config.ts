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
      ],
    },
  },
});
