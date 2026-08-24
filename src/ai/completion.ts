import {
  type ChatModel,
  isLlmProviderConfigured,
  LLM_GATEWAY_REQUIRED_MESSAGE,
  type LlmProviderId,
  resolveLanguageModel,
} from "@mcarvin/smart-diff";
import { POLICY_DEFAULT } from "./policies.js";
import { truncateForPrompt } from "./textLimits.js";
import type { LabflowLanguageModelProvider, LabflowLlm } from "./types.js";

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
   * Bypass env-based provider resolution entirely — hand-wire a smart-diff
   * `ChatModel` (e.g. to attach middlewares, retries, or a test mock).
   * When set, `provider` / `defaultModel` are ignored.
   */
  languageModelProvider?: LabflowLanguageModelProvider;
};

/**
 * Build a {@link LabflowLlm} backed by `@mcarvin/smart-diff`'s chat client.
 * Any provider supported by smart-diff works: `openai`, `openai-compatible`,
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

  const resolveModel = async (modelId?: string): Promise<ChatModel> => {
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

    const { text } = await model.generate({
      system,
      prompt: user,
      temperature: resolveTemperature(),
      maxOutputTokens: resolveMaxOutputTokens(),
    });

    if (!text) {
      throw new Error("LLM response had no text content.");
    }
    return text;
  };
}

/** Same env var and default (0.2) as `@mcarvin/smart-diff`'s internal resolver. */
function resolveTemperature(): number {
  const raw = process.env.LLM_TEMPERATURE?.trim();
  if (raw) {
    const parsed = Number.parseFloat(raw);
    if (Number.isFinite(parsed)) {
      return Math.min(2, Math.max(0, parsed));
    }
  }
  return 0.2;
}

/** Same env vars and default (4000) as `@mcarvin/smart-diff`'s internal resolver. */
function resolveMaxOutputTokens(): number {
  const raw = process.env.LLM_MAX_TOKENS ?? process.env.OPENAI_MAX_TOKENS;
  const parsed = raw !== undefined ? Number.parseInt(raw, 10) : 4000;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 4000;
}
