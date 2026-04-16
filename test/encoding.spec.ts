import { encodeGroupId, encodeProjectId } from "@src/gitlab/encoding.js";

describe("encoding", () => {
  it("encodeProjectId encodes slashes", () => {
    expect(encodeProjectId("a/b")).toBe("a%2Fb");
  });

  it("encodeProjectId passes through numeric ids as string", () => {
    expect(encodeProjectId(123)).toBe("123");
  });

  it("encodeGroupId encodes group path", () => {
    expect(encodeGroupId("g/sub")).toBe("g%2Fsub");
  });
});
