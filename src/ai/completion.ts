import { generateText, type LanguageModel } from "ai";
import {
  resolveLanguageModel,
  isLlmProviderConfigured,
  LLM_GATEWAY_REQUIRED_MESSAGE,
  type LlmProviderId,
} from "@mcarvin/smart-diff";

import type { LabflowLlm, LabflowLanguageModelProvider } from "./types.js";
import { POLICY_DEFAULT } from "./policies.js";
import { truncateForPrompt } from "./textLimits.js";

export type CreateLabflowLlmOptions = {
  /**
   * Explicit provider id. When omitted, smart-diff's env-based auto-detection
   * picks one (see `LLM_PROVIDER` / README for the resolution order).
   */
  provider?: LlmProviderId;
  /** Overrides `LLM_MODEL` env and the per-provider default model. */
  defaultModel?: string;
  /** Bound total user prompt size after truncation. */
  maxUserChars?: number;
  /**
   * Bypass env-based provider resolution entirely — hand-wire a Vercel AI SDK
   * `LanguageModel` (e.g. to attach middlewares, retries, or a test mock).
   * When set, `provider` / `defaultModel` are ignored.
   */
  languageModelProvider?: LabflowLanguageModelProvider;
};

/**
 * Build a {@link LabflowLlm} backed by the Vercel AI SDK. Any provider
 * supported by smart-diff v2 works: `openai`, `openai-compatible`,
 * `anthropic`, `google`, `bedrock`, `mistral`, `cohere`, `groq`, `xai`,
 * `deepseek`.
 *
 * Configuration is the same as `@mcarvin/smart-diff` (see its README):
 * - `LLM_PROVIDER` explicitly selects a provider; otherwise auto-detected
 *   from env vars (`LLM_BASE_URL`/`OPENAI_BASE_URL` → `openai-compatible`,
 *   `OPENAI_API_KEY`/`LLM_API_KEY` → `openai`, `ANTHROPIC_API_KEY`,
 *   `GOOGLE_GENERATIVE_AI_API_KEY`, `MISTRAL_API_KEY`, `COHERE_API_KEY`,
 *   `GROQ_API_KEY`, `XAI_API_KEY`, `DEEPSEEK_API_KEY`, and finally
 *   header-only auth via `OPENAI_DEFAULT_HEADERS`/`LLM_DEFAULT_HEADERS`).
 * - `LLM_MODEL` overrides the per-provider default model id.
 * - `OPENAI_DEFAULT_HEADERS` / `LLM_DEFAULT_HEADERS` carry extra headers for
 *   OpenAI / OpenAI-compatible requests (e.g. RBAC tokens).
 */
export function createLabflowLlm(
  options: CreateLabflowLlmOptions = {},
): LabflowLlm {
  const maxUserChars = options.maxUserChars ?? 120_000;
  const envModel = process.env.LLM_MODEL ?? process.env.OPENAI_MODEL;
  const defaultModel = options.defaultModel ?? envModel;

  const resolveModel = async (modelId?: string): Promise<LanguageModel> => {
    if (options.languageModelProvider) {
      return options.languageModelProvider();
    }
    if (!isLlmProviderConfigured()) {
      throw new Error(LLM_GATEWAY_REQUIRED_MESSAGE);
    }
    return resolveLanguageModel({
      provider: options.provider,
      model: modelId ?? defaultModel,
    });
  };

  return async (input) => {
    const user = truncateForPrompt(input.user, maxUserChars);
    const system = [POLICY_DEFAULT, input.system].filter(Boolean).join("\n\n");
    const model = await resolveModel(input.model);

    const { text } = await generateText({
      model,
      system,
      prompt: user,
    });

    if (!text) {
      throw new Error("LLM response had no text content.");
    }
    return text;
  };
}
