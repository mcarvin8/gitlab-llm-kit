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
};

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
