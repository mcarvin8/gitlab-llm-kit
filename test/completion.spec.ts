import { createLabflowLlm } from "@src/ai/completion.js";

describe("createLabflowLlm", () => {
  it("throws when no API key and no header auth", async () => {
    const oldKey = process.env.OPENAI_API_KEY;
    const oldOpenaiHeaders = process.env.OPENAI_DEFAULT_HEADERS;
    const oldLlmHeaders = process.env.LLM_DEFAULT_HEADERS;
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_DEFAULT_HEADERS;
    delete process.env.LLM_DEFAULT_HEADERS;
    const llm = createLabflowLlm({ apiKey: "" });
    await expect(
      llm({ system: "s", user: "u" }),
    ).rejects.toThrow(/Missing OPENAI_API_KEY/);
    if (oldKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = oldKey;
    }
    if (oldOpenaiHeaders === undefined) {
      delete process.env.OPENAI_DEFAULT_HEADERS;
    } else {
      process.env.OPENAI_DEFAULT_HEADERS = oldOpenaiHeaders;
    }
    if (oldLlmHeaders === undefined) {
      delete process.env.LLM_DEFAULT_HEADERS;
    } else {
      process.env.LLM_DEFAULT_HEADERS = oldLlmHeaders;
    }
  });
});
