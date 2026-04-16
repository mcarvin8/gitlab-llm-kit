import { truncateForPrompt } from "@src/ai/textLimits.js";

describe("truncateForPrompt", () => {
  it("does not truncate short strings", () => {
    expect(truncateForPrompt("hello", 100)).toBe("hello");
  });

  it("truncates with notice", () => {
    const s = "a".repeat(20);
    const out = truncateForPrompt(s, 10);
    expect(out.startsWith("aaaaaaaaaa")).toBe(true);
    expect(out).toContain("Truncated");
  });
});
