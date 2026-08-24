import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";

const { mockResolveLanguageModel, mockIsLlmProviderConfigured } = vi.hoisted(
  () => ({
    mockResolveLanguageModel: vi.fn(),
    mockIsLlmProviderConfigured: vi.fn(),
  }),
);

vi.mock("@mcarvin/smart-diff", () => ({
  __esModule: true,
  resolveLanguageModel: mockResolveLanguageModel,
  isLlmProviderConfigured: mockIsLlmProviderConfigured,
  LLM_GATEWAY_REQUIRED_MESSAGE:
    "No LLM provider is configured. Set credentials (e.g. OPENAI_API_KEY / LLM_API_KEY) or provide an llmModelProvider.",
}));

import { createLabflowLlm } from "@src/ai/completion.js";

const mockGenerate = vi.fn() as Mock;

const FAKE_MODEL = { generate: mockGenerate } as unknown;

describe("createLabflowLlm", () => {
  beforeEach(() => {
    mockGenerate.mockReset();
    mockGenerate.mockResolvedValue({ text: "assistant text" });
    mockResolveLanguageModel.mockReset();
    mockIsLlmProviderConfigured.mockReset();
    mockIsLlmProviderConfigured.mockReturnValue(true);
    mockResolveLanguageModel.mockResolvedValue(FAKE_MODEL);
  });

  it("returns the LLM text content", async () => {
    const llm = createLabflowLlm({ defaultModel: "custom-model" });
    const out = await llm({ system: "sys", user: "usr" });
    expect(out).toBe("assistant text");
    expect(mockGenerate).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: "usr",
        system: expect.stringContaining("sys"),
      }),
    );
    expect(mockResolveLanguageModel).toHaveBeenCalledWith(
      expect.objectContaining({ model: "custom-model" }),
    );
  });

  it("uses model from input over default", async () => {
    const llm = createLabflowLlm({ defaultModel: "a" });
    await llm({ system: "s", user: "u", model: "b" });
    expect(mockResolveLanguageModel).toHaveBeenLastCalledWith(
      expect.objectContaining({ model: "b" }),
    );
  });

  it("throws when the chat model returns empty text", async () => {
    mockGenerate.mockResolvedValueOnce({ text: "" });
    const llm = createLabflowLlm();
    await expect(llm({ system: "s", user: "u" })).rejects.toThrow(
      /no text content/,
    );
  });

  it("passes an explicit provider through to resolveLanguageModel", async () => {
    const llm = createLabflowLlm({
      provider: "anthropic",
      defaultModel: "claude",
    });
    await llm({ system: "s", user: "u" });
    expect(mockResolveLanguageModel).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "anthropic", model: "claude" }),
    );
  });

  it("throws with the smart-diff gateway-required message when unconfigured", async () => {
    mockIsLlmProviderConfigured.mockReturnValue(false);
    const llm = createLabflowLlm();
    await expect(llm({ system: "s", user: "u" })).rejects.toThrow(
      /No LLM provider is configured/,
    );
  });

  it("uses the supplied languageModelProvider and skips env resolution", async () => {
    const customGenerate = vi.fn().mockResolvedValue({ text: "custom text" });
    const custom = { generate: customGenerate } as unknown;
    const provider = vi.fn().mockResolvedValue(custom);
    mockIsLlmProviderConfigured.mockReturnValue(false);

    const llm = createLabflowLlm({ languageModelProvider: provider });
    const out = await llm({ system: "s", user: "u" });

    expect(out).toBe("custom text");
    expect(provider).toHaveBeenCalledTimes(1);
    expect(mockResolveLanguageModel).not.toHaveBeenCalled();
    expect(mockGenerate).not.toHaveBeenCalled();
    expect(customGenerate).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: "u" }),
    );
  });

  it("honors LLM_MODEL from env when no defaultModel option is set", async () => {
    const prev = process.env.LLM_MODEL;
    process.env.LLM_MODEL = "env-model";
    try {
      const llm = createLabflowLlm();
      await llm({ system: "s", user: "u" });
      expect(mockResolveLanguageModel).toHaveBeenCalledWith(
        expect.objectContaining({ model: "env-model" }),
      );
    } finally {
      if (prev === undefined) {
        delete process.env.LLM_MODEL;
      } else {
        process.env.LLM_MODEL = prev;
      }
    }
  });
});
