import OpenAI from "openai";

import type { LabflowLlm } from "./types.js";
import { POLICY_DEFAULT } from "./policies.js";
import { truncateForPrompt } from "./textLimits.js";

export type CreateLabflowLlmOptions = {
  /** Defaults to `process.env.OPENAI_API_KEY`. */
  apiKey?: string;
  /** e.g. `https://api.openai.com/v1` or a compatible gateway. */
  baseURL?: string;
  defaultModel?: string;
  /** Bound total user prompt size after truncation. */
  maxUserChars?: number;
  /**
   * Extra HTTP headers on every request (e.g. gateway auth / tenancy).
   * Merged with optional JSON from `OPENAI_DEFAULT_HEADERS` or `LLM_DEFAULT_HEADERS` (same idea as `@mcarvin/smart-diff`);
   * keys in this object win on conflict.
   */
  defaultHeaders?: Record<string, string>;
};

function defaultHeadersFromEnv(): Record<string, string> | undefined {
  const raw =
    process.env.OPENAI_DEFAULT_HEADERS?.trim() ||
    process.env.LLM_DEFAULT_HEADERS?.trim();
  if (!raw) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
        if (typeof v === "string") {
          out[k] = v;
        }
      }
      return Object.keys(out).length > 0 ? out : undefined;
    }
  } catch {
    // ignore invalid JSON
  }
  return undefined;
}

/**
 * Build a {@link LabflowLlm} using the official `openai` package.
 * Set `OPENAI_API_KEY` or pass `apiKey`.
 */
export function createLabflowLlm(options: CreateLabflowLlmOptions = {}): LabflowLlm {
  const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY ?? "";
  const maxUserChars = options.maxUserChars ?? 120_000;

  if (!apiKey) {
    return async () => {
      throw new Error(
        "createLabflowLlm: Missing OPENAI_API_KEY (or pass apiKey in options).",
      );
    };
  }

  const openai = new OpenAI({
    apiKey,
    baseURL: options.baseURL ?? process.env.OPENAI_BASE_URL,
    defaultHeaders: {
      ...defaultHeadersFromEnv(),
      ...options.defaultHeaders,
    },
  });

  const defaultModel =
    options.defaultModel ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  return async (input) => {
    const model = input.model ?? defaultModel;
    const user = truncateForPrompt(input.user, maxUserChars);
    const system = [POLICY_DEFAULT, input.system].filter(Boolean).join("\n\n");

    const res = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });

    const text = res.choices[0]?.message?.content;
    if (!text) {
      throw new Error("OpenAI response had no message content.");
    }
    return text;
  };
}
