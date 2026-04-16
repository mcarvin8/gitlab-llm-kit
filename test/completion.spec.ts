import { createLabflowLlm } from "@src/ai/completion.js";

describe("createLabflowLlm", () => {
  it("throws when no API key", async () => {
    const old = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    const llm = createLabflowLlm({ apiKey: "" });
    await expect(
      llm({ system: "s", user: "u" }),
    ).rejects.toThrow(/Missing OPENAI_API_KEY/);
    process.env.OPENAI_API_KEY = old;
  });
});
