import type { ChatModel, LlmProviderId } from "@mcarvin/smart-diff";

/**
 * Pluggable LLM caller for GitLab insights. Swap for tests or a gateway;
 * default uses `@mcarvin/smart-diff`'s built-in chat client to reach any
 * supported provider (OpenAI, Anthropic, Google, Bedrock, Mistral, Cohere,
 * Groq, xAI, DeepSeek, or any OpenAI-compatible endpoint).
 */
export type LabflowLlm = (input: {
  system: string;
  user: string;
  model?: string;
}) => Promise<string>;

/**
 * Factory that returns a smart-diff `ChatModel`. Use this to bypass
 * env-based provider resolution entirely (e.g. in tests or for hand-wired
 * gateways with middlewares/retries).
 */
export type LabflowLanguageModelProvider = () => Promise<ChatModel>;

export type { LlmProviderId };
