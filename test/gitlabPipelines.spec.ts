import { describe, expect, it, vi, type Mock } from "vitest";

import type { GitlabClient } from "@src/gitlab/client.js";
import {
  getJob,
  getJobTrace,
  getPipeline,
  listPipelineJobs,
  listPipelines,
} from "@src/gitlab/pipelines.js";

function mockClient(): GitlabClient & {
  request: Mock;
  requestAllPages: Mock;
  requestText: Mock;
} {
  return {
    request: vi.fn(),
    requestAllPages: vi.fn(),
    requestText: vi.fn(),
  } as unknown as GitlabClient & {
    request: Mock;
    requestAllPages: Mock;
    requestText: Mock;
  };
}

describe("gitlab pipelines API", () => {
  it("listPipelines passes encoded project path and optional query", async () => {
    const c = mockClient();
    c.requestAllPages.mockResolvedValue([{ id: 1, iid: 1, status: "success" }]);
    await listPipelines(c, "group/sub", { ref: "main", per_page: 20 });
    expect(c.requestAllPages).toHaveBeenCalledWith("/projects/group%2Fsub/pipelines", {
      ref: "main",
      per_page: 20,
    });

    await listPipelines(c, 99);
    expect(c.requestAllPages).toHaveBeenCalledWith("/projects/99/pipelines", {});
  });

  it("getPipeline", async () => {
    const c = mockClient();
    c.request.mockResolvedValue({ id: 9, iid: 2, status: "running" });
    const p = await getPipeline(c, "group/sub", 9);
    expect(c.request).toHaveBeenCalledWith("GET", "/projects/group%2Fsub/pipelines/9");
    expect(p.status).toBe("running");
  });

  it("listPipelineJobs", async () => {
    const c = mockClient();
    c.requestAllPages.mockResolvedValue([
      { id: 1, name: "build", status: "success", stage: "build" },
    ]);
    await listPipelineJobs(c, "p", 9, { per_page: 50 });
    expect(c.requestAllPages).toHaveBeenCalledWith("/projects/p/pipelines/9/jobs", {
      per_page: 50,
    });

    await listPipelineJobs(c, "p", 9);
    expect(c.requestAllPages).toHaveBeenLastCalledWith("/projects/p/pipelines/9/jobs", {});
  });

  it("getJob", async () => {
    const c = mockClient();
    c.request.mockResolvedValue({ id: 40, name: "deploy", status: "failed" });
    await getJob(c, "p", 40);
    expect(c.request).toHaveBeenCalledWith("GET", "/projects/p/jobs/40");
  });

  it("getJobTrace uses requestText for plain-text log", async () => {
    const c = mockClient();
    c.requestText.mockResolvedValue("ERROR: script failed\n");
    const trace = await getJobTrace(c, "p", 40);
    expect(c.requestText).toHaveBeenCalledWith("GET", "/projects/p/jobs/40/trace");
    expect(trace).toContain("script failed");
  });
});
