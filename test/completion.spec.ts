jest.mock("ai", () => {
  const mockGenerateText = jest.fn().mockResolvedValue({ text: "assistant text" });
  return {
    __esModule: true,
    generateText: mockGenerateText,
  };
});

const mockResolveLanguageModel = jest.fn();
const mockIsLlmProviderConfigured = jest.fn();

jest.mock("@mcarvin/smart-diff", () => ({
  __esModule: true,
  resolveLanguageModel: mockResolveLanguageModel,
  isLlmProviderConfigured: mockIsLlmProviderConfigured,
  LLM_GATEWAY_REQUIRED_MESSAGE:
    "No LLM provider is configured. Set credentials (e.g. OPENAI_API_KEY / LLM_API_KEY) or provide an llmModelProvider.",
}));

import { createLabflowLlm } from "@src/ai/completion.js";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { generateText } = require("ai") as { generateText: jest.Mock };

const FAKE_MODEL = { __fakeLanguageModel: true } as unknown;

describe("createLabflowLlm", () => {
  beforeEach(() => {
    generateText.mockClear();
    mockResolveLanguageModel.mockReset();
    mockIsLlmProviderConfigured.mockReset();
    mockIsLlmProviderConfigured.mockReturnValue(true);
    mockResolveLanguageModel.mockResolvedValue(FAKE_MODEL);
  });

  it("returns the LLM text content", async () => {
    const llm = createLabflowLlm({ defaultModel: "custom-model" });
    const out = await llm({ system: "sys", user: "usr" });
    expect(out).toBe("assistant text");
    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: FAKE_MODEL,
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

  it("throws when Vercel AI SDK returns empty text", async () => {
    generateText.mockResolvedValueOnce({ text: "" });
    const llm = createLabflowLlm();
    await expect(llm({ system: "s", user: "u" })).rejects.toThrow(
      /no text content/,
    );
  });

  it("passes an explicit provider through to resolveLanguageModel", async () => {
    const llm = createLabflowLlm({ provider: "anthropic", defaultModel: "claude" });
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
    const custom = { __custom: true } as unknown;
    const provider = jest.fn().mockResolvedValue(custom);
    mockIsLlmProviderConfigured.mockReturnValue(false);

    const llm = createLabflowLlm({ languageModelProvider: provider });
    const out = await llm({ system: "s", user: "u" });

    expect(out).toBe("assistant text");
    expect(provider).toHaveBeenCalledTimes(1);
    expect(mockResolveLanguageModel).not.toHaveBeenCalled();
    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({ model: custom }),
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
