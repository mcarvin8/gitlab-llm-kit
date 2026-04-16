import type { GitlabClient } from "./client.js";
import { encodeProjectId } from "./encoding.js";
import type { Issue, Note } from "./types.js";

export async function getIssue(
  client: GitlabClient,
  projectId: string | number,
  issueIid: number,
): Promise<Issue> {
  const id = encodeProjectId(projectId);
  return client.request<Issue>("GET", `/projects/${id}/issues/${issueIid}`);
}

export async function listIssueNotes(
  client: GitlabClient,
  projectId: string | number,
  issueIid: number,
): Promise<Note[]> {
  const id = encodeProjectId(projectId);
  return client.requestAllPages<Note>(`/projects/${id}/issues/${issueIid}/notes`);
}

export async function listProjectIssues(
  client: GitlabClient,
  projectId: string | number,
  query?: Record<string, string | number | boolean | undefined>,
): Promise<Issue[]> {
  const id = encodeProjectId(projectId);
  return client.requestAllPages<Issue>(`/projects/${id}/issues`, query ?? {});
}
