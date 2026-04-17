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
const OpenAI = require("openai").default as jest.Mock;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { mockCreate } = require("openai") as { mockCreate: jest.Mock };

describe("createLabflowLlm with API key", () => {
  beforeEach(() => {
    OpenAI.mockClear();
  });

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

  it("passes defaultHeaders to OpenAI client", async () => {
    createLabflowLlm({
      apiKey: "k",
      defaultHeaders: { "X-Custom": "a", "X-Other": "b" },
    });
    expect(OpenAI).toHaveBeenCalledWith(
      expect.objectContaining({
        defaultHeaders: expect.objectContaining({
          "X-Custom": "a",
          "X-Other": "b",
        }),
      }),
    );
  });

  it("uses placeholder apiKey when only defaultHeaders authenticate", async () => {
    const llm = createLabflowLlm({
      apiKey: "",
      baseURL: "https://gateway.example/v1",
      defaultHeaders: { Authorization: "Bearer gateway-token" },
    });
    const out = await llm({ system: "s", user: "u" });
    expect(out).toBe("assistant text");
    expect(OpenAI).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: "unused",
        defaultHeaders: expect.objectContaining({
          Authorization: "Bearer gateway-token",
        }),
      }),
    );
  });

  it("merges OPENAI_DEFAULT_HEADERS JSON with option defaultHeaders", async () => {
    const old = process.env.OPENAI_DEFAULT_HEADERS;
    process.env.OPENAI_DEFAULT_HEADERS = JSON.stringify({
      "X-From-Env": "env",
      "X-Shared": "from-env",
    });
    try {
      createLabflowLlm({
        apiKey: "k",
        defaultHeaders: { "X-Shared": "from-options" },
      });
      expect(OpenAI).toHaveBeenCalledWith(
        expect.objectContaining({
          defaultHeaders: expect.objectContaining({
            "X-From-Env": "env",
            "X-Shared": "from-options",
          }),
        }),
      );
    } finally {
      if (old === undefined) {
        delete process.env.OPENAI_DEFAULT_HEADERS;
      } else {
        process.env.OPENAI_DEFAULT_HEADERS = old;
      }
    }
  });

  it("header-only auth from env without OPENAI_API_KEY", async () => {
    const oldKey = process.env.OPENAI_API_KEY;
    const oldHeaders = process.env.OPENAI_DEFAULT_HEADERS;
    delete process.env.OPENAI_API_KEY;
    process.env.OPENAI_DEFAULT_HEADERS = JSON.stringify({ "X-API-Key": "from-env" });
    try {
      createLabflowLlm({ apiKey: "" });
      expect(OpenAI).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKey: "unused",
          defaultHeaders: expect.objectContaining({ "X-API-Key": "from-env" }),
        }),
      );
    } finally {
      if (oldKey === undefined) {
        delete process.env.OPENAI_API_KEY;
      } else {
        process.env.OPENAI_API_KEY = oldKey;
      }
      if (oldHeaders === undefined) {
        delete process.env.OPENAI_DEFAULT_HEADERS;
      } else {
        process.env.OPENAI_DEFAULT_HEADERS = oldHeaders;
      }
    }
  });
});
