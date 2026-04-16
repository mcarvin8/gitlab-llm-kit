import { encodeQuery } from "@src/gitlab/query.js";

describe("encodeQuery", () => {
  it("builds query string skipping undefined", () => {
    expect(encodeQuery({ a: 1, b: "x y", c: undefined })).toBe("?a=1&b=x%20y");
  });

  it("returns empty when no params", () => {
    expect(encodeQuery({})).toBe("");
  });
});
