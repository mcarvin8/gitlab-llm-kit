import type { GitlabClient } from "@src/gitlab/client.js";
import { GitlabHttpError } from "@src/gitlab/errors.js";
import { listProjectAuditEvents } from "@src/gitlab/audit.js";
import {
  listDeployments,
  listEnvironments,
} from "@src/gitlab/deployments.js";
import {
  getEpic,
  listEpicIssues,
  listGroupEpics,
} from "@src/gitlab/epics.js";
import { listGroupEvents, listProjectEvents } from "@src/gitlab/events.js";
import {
  createIssueNote,
  getIssue,
  listIssueNotes,
  listProjectIssues,
} from "@src/gitlab/issues.js";
import {
  createMergeRequestNote,
  getMergeRequest,
  getMergeRequestChanges,
  listMergeRequestCommits,
  listMergeRequestDiscussions,
  listMergeRequestNotes,
} from "@src/gitlab/mergeRequests.js";
import { getProject, getReadmeFile } from "@src/gitlab/projectMeta.js";
import { getReleaseByTag, listReleases, upsertRelease } from "@src/gitlab/releases.js";
import {
  compareRefs,
  getFile,
  listCommitComments,
  listCommits,
} from "@src/gitlab/repository.js";
import {
  searchGitlab,
  searchInGroup,
  searchInProject,
} from "@src/gitlab/search.js";
import { listVulnerabilityFindings } from "@src/gitlab/security.js";
import {
  getSnippet,
  getWikiPage,
  listProjectSnippets,
  listWikiPages,
} from "@src/gitlab/wikiAndSnippets.js";

function mockClient(): GitlabClient & {
  request: jest.Mock;
  requestAllPages: jest.Mock;
} {
  return {
    request: jest.fn(),
    requestAllPages: jest.fn(),
  } as unknown as GitlabClient & {
    request: jest.Mock;
    requestAllPages: jest.Mock;
  };
}

describe("gitlab API wrappers", () => {
  it("getMergeRequest", async () => {
    const c = mockClient();
    c.request.mockResolvedValue({ id: 1, iid: 2, title: "t", state: "open" });
    const r = await getMergeRequest(c, "ns/proj", 5);
    expect(c.request).toHaveBeenCalledWith(
      "GET",
      "/projects/ns%2Fproj/merge_requests/5",
    );
    expect(r.title).toBe("t");
  });

  it("listMergeRequestNotes", async () => {
    const c = mockClient();
    c.requestAllPages.mockResolvedValue([{ id: 1, body: "x" }]);
    const r = await listMergeRequestNotes(c, "p", 1);
    expect(c.requestAllPages).toHaveBeenCalledWith(
      "/projects/p/merge_requests/1/notes",
    );
    expect(r).toHaveLength(1);
  });

  it("getMergeRequestChanges", async () => {
    const c = mockClient();
    c.request.mockResolvedValue({ changes: [] });
    await getMergeRequestChanges(c, "p", 2);
    expect(c.request).toHaveBeenCalledWith(
      "GET",
      "/projects/p/merge_requests/2/changes",
    );
  });

  it("listMergeRequestCommits", async () => {
    const c = mockClient();
    c.requestAllPages.mockResolvedValue([]);
    await listMergeRequestCommits(c, "p", 3);
    expect(c.requestAllPages).toHaveBeenCalledWith(
      "/projects/p/merge_requests/3/commits",
    );
  });

  it("listMergeRequestDiscussions", async () => {
    const c = mockClient();
    c.requestAllPages.mockResolvedValue([]);
    await listMergeRequestDiscussions(c, "p", 4);
    expect(c.requestAllPages).toHaveBeenCalledWith(
      "/projects/p/merge_requests/4/discussions",
    );
  });

  it("createMergeRequestNote", async () => {
    const c = mockClient();
    c.request.mockResolvedValue({ id: 1, body: "hello" });
    const note = await createMergeRequestNote(c, "g/p", 10, {
      body: "## Summary\n",
    });
    expect(c.request).toHaveBeenCalledWith(
      "POST",
      "/projects/g%2Fp/merge_requests/10/notes",
      { body: { body: "## Summary\n" } },
    );
    expect(note.body).toBe("hello");
  });

  it("getIssue and listIssueNotes and listProjectIssues", async () => {
    const c = mockClient();
    c.request.mockResolvedValue({ id: 1, iid: 1, title: "i", state: "open" });
    await getIssue(c, "g/p", 9);
    expect(c.request).toHaveBeenCalledWith("GET", "/projects/g%2Fp/issues/9");

    c.requestAllPages.mockResolvedValue([]);
    await listIssueNotes(c, "g/p", 9);
    expect(c.requestAllPages).toHaveBeenCalledWith(
      "/projects/g%2Fp/issues/9/notes",
    );

    await listProjectIssues(c, "g/p", { state: "opened" });
    expect(c.requestAllPages).toHaveBeenCalledWith(
      "/projects/g%2Fp/issues",
      { state: "opened" },
    );

    await listProjectIssues(c, "g/p");
    expect(c.requestAllPages).toHaveBeenCalledWith("/projects/g%2Fp/issues", {});
  });

  it("createIssueNote", async () => {
    const c = mockClient();
    c.request.mockResolvedValue({ id: 2, body: "note" });
    const note = await createIssueNote(c, "g/p", 7, { body: "LGTM" });
    expect(c.request).toHaveBeenCalledWith(
      "POST",
      "/projects/g%2Fp/issues/7/notes",
      { body: { body: "LGTM" } },
    );
    expect(note.body).toBe("note");
  });

  it("epics", async () => {
    const c = mockClient();
    c.request.mockResolvedValue({ id: 1, iid: 1, title: "e" });
    await getEpic(c, "grp", 1);
    expect(c.request).toHaveBeenCalledWith("GET", "/groups/grp/epics/1");

    c.requestAllPages.mockResolvedValue([]);
    await listEpicIssues(c, "grp", 2);
    expect(c.requestAllPages).toHaveBeenCalledWith("/groups/grp/epics/2/issues");

    await listGroupEpics(c, "grp", { state: "opened" });
    expect(c.requestAllPages).toHaveBeenCalledWith("/groups/grp/epics", {
      state: "opened",
    });
  });

  it("repository", async () => {
    const c = mockClient();
    c.requestAllPages.mockResolvedValue([]);
    await listCommits(c, "p", { ref_name: "main" });
    expect(c.requestAllPages).toHaveBeenCalledWith(
      "/projects/p/repository/commits",
      { ref_name: "main" },
    );

    await listCommitComments(c, "p", "abc123");
    expect(c.requestAllPages).toHaveBeenCalledWith(
      "/projects/p/repository/commits/abc123/comments",
    );

    c.request.mockResolvedValue({ content: "eA==", encoding: "base64" });
    await getFile(c, "p", "README.md", "main");
    expect(c.request).toHaveBeenCalledWith(
      "GET",
      "/projects/p/repository/files/README.md",
      { query: { ref: "main" } },
    );

    c.request.mockResolvedValue({ commits: [] });
    await compareRefs(c, "p", "a", "b");
    expect(c.request).toHaveBeenCalledWith(
      "GET",
      "/projects/p/repository/compare",
      { query: { from: "a", to: "b" } },
    );
  });

  it("releases", async () => {
    const c = mockClient();
    c.request.mockResolvedValue({ tag_name: "v1" });
    await getReleaseByTag(c, "p", "v1.0");
    expect(c.request).toHaveBeenCalledWith(
      "GET",
      "/projects/p/releases/v1.0",
    );

    c.requestAllPages.mockResolvedValue([]);
    await listReleases(c, "p");
    expect(c.requestAllPages).toHaveBeenCalledWith("/projects/p/releases");
  });

  it("upsertRelease updates when release exists", async () => {
    const c = mockClient();
    c.request
      .mockResolvedValueOnce({ tag_name: "v2", description: "old" })
      .mockResolvedValueOnce({ tag_name: "v2", description: "new" });
    const r = await upsertRelease(c, "p", "v2.0.0", { description: "new" });
    expect(c.request).toHaveBeenNthCalledWith(
      1,
      "GET",
      "/projects/p/releases/v2.0.0",
    );
    expect(c.request).toHaveBeenNthCalledWith(2, "PUT", "/projects/p/releases/v2.0.0", {
      body: { description: "new" },
    });
    expect(r.description).toBe("new");
  });

  it("upsertRelease PUT includes name when provided", async () => {
    const c = mockClient();
    c.request
      .mockResolvedValueOnce({ tag_name: "v1" })
      .mockResolvedValueOnce({ tag_name: "v1", name: "R1" });
    await upsertRelease(c, "p", "v1", {
      description: "d",
      name: "Release 1",
    });
    expect(c.request).toHaveBeenNthCalledWith(2, "PUT", "/projects/p/releases/v1", {
      body: { description: "d", name: "Release 1" },
    });
  });

  it("upsertRelease creates when GET returns 404", async () => {
    const c = mockClient();
    c.request
      .mockRejectedValueOnce(
        new GitlabHttpError("missing", { status: 404, body: "{}" }),
      )
      .mockResolvedValueOnce({
        tag_name: "v3",
        name: "v3",
        description: "fresh",
      });
    const r = await upsertRelease(c, "p", "v3", { description: "fresh" });
    expect(c.request).toHaveBeenNthCalledWith(2, "POST", "/projects/p/releases", {
      body: {
        tag_name: "v3",
        description: "fresh",
        name: "v3",
      },
    });
    expect(r.description).toBe("fresh");
  });

  it("upsertRelease POST includes ref when provided", async () => {
    const c = mockClient();
    c.request
      .mockRejectedValueOnce(
        new GitlabHttpError("missing", { status: 404, body: "{}" }),
      )
      .mockResolvedValueOnce({ tag_name: "v4" });
    await upsertRelease(c, "p", "v4", {
      description: "d",
      ref: "main",
      name: "V four",
    });
    expect(c.request).toHaveBeenNthCalledWith(2, "POST", "/projects/p/releases", {
      body: {
        tag_name: "v4",
        description: "d",
        name: "V four",
        ref: "main",
      },
    });
  });

  it("upsertRelease rethrows non-404 from getReleaseByTag", async () => {
    const c = mockClient();
    c.request.mockRejectedValueOnce(
      new GitlabHttpError("nope", { status: 403, body: "{}" }),
    );
    await expect(
      upsertRelease(c, "p", "t", { description: "x" }),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("listVulnerabilityFindings", async () => {
    const c = mockClient();
    c.requestAllPages.mockResolvedValue([]);
    await listVulnerabilityFindings(c, "p", { report_type: "sast" });
    expect(c.requestAllPages).toHaveBeenCalledWith(
      "/projects/p/vulnerability_findings",
      { report_type: "sast" },
    );
  });

  it("wiki and snippets", async () => {
    const c = mockClient();
    c.request.mockResolvedValue([]);
    await listWikiPages(c, "p");
    expect(c.request).toHaveBeenCalledWith("GET", "/projects/p/wikis");

    c.request.mockResolvedValue({ slug: "home", title: "Home" });
    await getWikiPage(c, "p", "home");
    expect(c.request).toHaveBeenCalledWith("GET", "/projects/p/wikis/home", {
      query: undefined,
    });

    await getWikiPage(c, "p", "home", "2");
    expect(c.request).toHaveBeenCalledWith("GET", "/projects/p/wikis/home", {
      query: { version: "2" },
    });

    c.requestAllPages.mockResolvedValue([]);
    await listProjectSnippets(c, "p");
    expect(c.requestAllPages).toHaveBeenCalledWith("/projects/p/snippets");

    c.request.mockResolvedValue({ id: 1, title: "s" });
    await getSnippet(c, 99);
    expect(c.request).toHaveBeenCalledWith("GET", "/snippets/99");
  });

  it("search", async () => {
    const c = mockClient();
    c.requestAllPages.mockResolvedValue([]);
    await searchGitlab(c, {
      scope: "issues",
      search: "bug",
      projectId: 1,
      groupId: 2,
      additional: { foo: "bar" },
    });
    expect(c.requestAllPages).toHaveBeenCalledWith("/search", {
      scope: "issues",
      search: "bug",
      foo: "bar",
      project_id: 1,
      group_id: 2,
    });

    await searchInProject(c, 3, "commits", "fix");
    expect(c.requestAllPages).toHaveBeenCalledWith("/search", {
      scope: "commits",
      search: "fix",
      project_id: 3,
    });

    await searchInGroup(c, 4, "merge_requests", "feat");
    expect(c.requestAllPages).toHaveBeenCalledWith("/search", {
      scope: "merge_requests",
      search: "feat",
      group_id: 4,
    });
  });

  it("deployments and environments", async () => {
    const c = mockClient();
    c.requestAllPages.mockResolvedValue([]);
    await listDeployments(c, "p", { environment: "prod" });
    expect(c.requestAllPages).toHaveBeenCalledWith(
      "/projects/p/deployments",
      { environment: "prod" },
    );

    await listEnvironments(c, "p");
    expect(c.requestAllPages).toHaveBeenCalledWith(
      "/projects/p/environments",
    );
  });

  it("events", async () => {
    const c = mockClient();
    c.requestAllPages.mockResolvedValue([]);
    await listProjectEvents(c, "p", { per_page: 20 });
    expect(c.requestAllPages).toHaveBeenCalledWith("/projects/p/events", {
      per_page: 20,
    });

    await listGroupEvents(c, "g", {});
    expect(c.requestAllPages).toHaveBeenCalledWith("/groups/g/events", {});
  });

  it("audit", async () => {
    const c = mockClient();
    c.requestAllPages.mockResolvedValue([]);
    await listProjectAuditEvents(c, "p");
    expect(c.requestAllPages).toHaveBeenCalledWith(
      "/projects/p/audit_events",
      {},
    );
  });

  it("getProject and getReadmeFile", async () => {
    const c = mockClient();
    c.request.mockResolvedValue({ id: 1, path_with_namespace: "a/b" });
    await getProject(c, "a/b");
    expect(c.request).toHaveBeenCalledWith("GET", "/projects/a%2Fb");

    c.request.mockResolvedValue({ content: "e30=", encoding: "base64" });
    await getReadmeFile(c, "p", "README.md", "main");
    expect(c.request).toHaveBeenCalledWith(
      "GET",
      "/projects/p/repository/files/README.md",
      { query: { ref: "main" } },
    );
  });
});
