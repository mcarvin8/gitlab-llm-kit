import { describe, expect, it, vi } from "vitest";

import { GitlabClient } from "@src/gitlab/client.js";
import { GitlabHttpError } from "@src/gitlab/errors.js";

describe("GitlabClient", () => {
  it("GET parses JSON", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ hello: "world" }),
    });
    const c = new GitlabClient({
      baseUrl: "https://gitlab.example.com/api/v4",
      token: "t",
      fetchFn: fetchFn as unknown as typeof fetch,
    });
    const r = await c.request<{ hello: string }>("GET", "/test");
    expect(r.hello).toBe("world");
  });

  it("throws GitlabHttpError on non-ok", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => "missing",
    });
    const c = new GitlabClient({
      token: "t",
      fetchFn: fetchFn as unknown as typeof fetch,
    });
    await expect(c.request("GET", "/nope")).rejects.toBeInstanceOf(GitlabHttpError);
  });

  it("requestAllPages stops when page shorter than per_page", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify([{ id: 1 }]),
    });
    const c = new GitlabClient({
      token: "t",
      fetchFn: fetchFn as unknown as typeof fetch,
    });
    const rows = await c.requestAllPages<{ id: number }>("/items", {
      per_page: 10,
    });
    expect(rows.length).toBe(1);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("requestAllPages fetches next page when full", async () => {
    const full = Array.from({ length: 2 }, (_, i) => ({ id: i }));
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(full),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify([]),
      });
    const c = new GitlabClient({
      token: "t",
      fetchFn: fetchFn as unknown as typeof fetch,
    });
    const rows = await c.requestAllPages<{ id: number }>("/items", {
      per_page: 2,
    });
    expect(rows).toHaveLength(2);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("uses OAuth bearer when oauth is true", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => "{}",
    });
    const c = new GitlabClient({
      token: "tok",
      oauth: true,
      fetchFn: fetchFn as unknown as typeof fetch,
    });
    await c.request("GET", "/x");
    const init = fetchFn.mock.calls[0][1] as { headers: Record<string, string> };
    expect(init.headers.Authorization).toBe("Bearer tok");
  });

  it("returns undefined for empty 200 body", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => "   ",
    });
    const c = new GitlabClient({
      token: "t",
      fetchFn: fetchFn as unknown as typeof fetch,
    });
    const r = await c.request<undefined>("GET", "/empty");
    expect(r).toBeUndefined();
  });

  it("throws when response is not JSON", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => "not json",
    });
    const c = new GitlabClient({
      token: "t",
      fetchFn: fetchFn as unknown as typeof fetch,
    });
    await expect(c.request("GET", "/bad")).rejects.toBeInstanceOf(GitlabHttpError);
  });

  it("normalizes base URL without /api/v4", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => "[]",
    });
    const c = new GitlabClient({
      baseUrl: "https://gitlab.example.com",
      token: "t",
      fetchFn: fetchFn as unknown as typeof fetch,
    });
    await c.request("GET", "/projects/1");
    expect(fetchFn.mock.calls[0][0]).toContain("/api/v4/projects/1");
  });

  it("POST sends JSON body", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '{"ok":true}',
    });
    const c = new GitlabClient({
      token: "t",
      fetchFn: fetchFn as unknown as typeof fetch,
    });
    await c.request("POST", "/hook", { body: { a: 1 } });
    const init = fetchFn.mock.calls[0][1] as { method: string; body: string };
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ a: 1 }));
  });

  it("requestText returns plain body without JSON parse", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => "section 1\njob output\n",
    });
    const c = new GitlabClient({
      token: "t",
      fetchFn: fetchFn as unknown as typeof fetch,
    });
    const text = await c.requestText("GET", "/projects/1/jobs/2/trace");
    expect(text).toBe("section 1\njob output\n");
  });

  it("requestText throws GitlabHttpError on non-ok", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => "missing",
    });
    const c = new GitlabClient({
      token: "t",
      fetchFn: fetchFn as unknown as typeof fetch,
    });
    await expect(c.requestText("GET", "/trace")).rejects.toBeInstanceOf(GitlabHttpError);
  });
});
