/** Smoke: smart-diff bridge re-exports compile. */
import { summarizeCompareDiffWithSmartDiff } from "@src/integrations/smartDiffBridge.js";

describe("smartDiffBridge", () => {
  it("exports summarizeCompareDiffWithSmartDiff", () => {
    expect(typeof summarizeCompareDiffWithSmartDiff).toBe("function");
  });
});
