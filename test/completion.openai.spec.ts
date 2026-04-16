jest.mock("openai", () => {
  const mockCreate = jest.fn().mockResolvedValue({
    choices: [{ message: { content: "assistant text" } }],
  });
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    })),
    mockCreate,
  };
});

import { createLabflowLlm } from "@src/ai/completion.js";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { mockCreate } = require("openai") as { mockCreate: jest.Mock };

describe("createLabflowLlm with API key", () => {
  it("returns assistant message content", async () => {
    const llm = createLabflowLlm({
      apiKey: "sk-test",
      baseURL: "https://example.com/v1",
      defaultModel: "custom-model",
    });
    const out = await llm({ system: "sys", user: "usr" });
    expect(out).toBe("assistant text");
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "custom-model",
        messages: expect.any(Array),
      }),
    );
  });

  it("uses model from input over default", async () => {
    const llm = createLabflowLlm({ apiKey: "k", defaultModel: "a" });
    await llm({ system: "s", user: "u", model: "b" });
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: "b" }),
    );
  });

  it("throws when OpenAI returns empty content", async () => {
    mockCreate.mockResolvedValueOnce({ choices: [{ message: {} }] });
    const llm = createLabflowLlm({ apiKey: "k" });
    await expect(llm({ system: "s", user: "u" })).rejects.toThrow(
      /no message content/,
    );
  });
});
