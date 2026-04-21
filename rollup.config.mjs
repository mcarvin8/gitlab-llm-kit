import typescript from "@rollup/plugin-typescript";
import terser from "@rollup/plugin-terser";

export default {
  input: "./src/index.ts",
  output: [
    {
      file: "./dist/index.mjs",
      format: "es",
      sourcemap: true,
    },
    {
      file: "./dist/index.cjs",
      format: "cjs",
      sourcemap: true,
    },
    {
      file: "./dist/index.umd.js",
      format: "umd",
      name: "labflowAi",
      globals: {},
      sourcemap: true,
    },
    {
      file: "./dist/index.min.mjs",
      format: "es",
      sourcemap: true,
      plugins: [terser()],
    },
    {
      file: "./dist/index.min.cjs",
      format: "cjs",
      sourcemap: true,
      plugins: [terser()],
    },
    {
      file: "./dist/index.min.umd.js",
      format: "umd",
      name: "labflowAi",
      globals: {},
      sourcemap: true,
      plugins: [terser()],
    },
  ],
  plugins: [
    typescript({
      tsconfig: "tsconfig.build.json",
      declaration: true,
      outDir: "./dist",
      declarationDir: "./dist/typings",
    }),
  ],
  external: [
    "ai",
    "@ai-sdk/openai",
    "@ai-sdk/openai-compatible",
    "@ai-sdk/anthropic",
    "@ai-sdk/google",
    "@ai-sdk/amazon-bedrock",
    "@ai-sdk/mistral",
    "@ai-sdk/cohere",
    "@ai-sdk/groq",
    "@ai-sdk/xai",
    "@ai-sdk/deepseek",
    "@mcarvin/smart-diff",
    "tslib",
  ],
};
