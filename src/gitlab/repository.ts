import type { GitlabClient } from "./client.js";
import { encodeProjectId } from "./encoding.js";
import type { Blob, Commit, Note, RepositoryCompare } from "./types.js";

export async function listCommits(
  client: GitlabClient,
  projectId: string | number,
  query?: { ref_name?: string; path?: string; since?: string; until?: string },
): Promise<Commit[]> {
  const id = encodeProjectId(projectId);
  return client.requestAllPages<Commit>(`/projects/${id}/repository/commits`, query ?? {});
}

export async function listCommitComments(
  client: GitlabClient,
  projectId: string | number,
  sha: string,
): Promise<Note[]> {
  const id = encodeProjectId(projectId);
  return client.requestAllPages<Note>(`/projects/${id}/repository/commits/${sha}/comments`);
}

export async function getFile(
  client: GitlabClient,
  projectId: string | number,
  filePath: string,
  ref: string,
): Promise<Blob> {
  const id = encodeProjectId(projectId);
  return client.request<Blob>("GET", `/projects/${id}/repository/files/${encodeURIComponent(filePath.trim())}`, {
    query: { ref },
  });
}

export async function compareRefs(
  client: GitlabClient,
  projectId: string | number,
  from: string,
  to: string,
): Promise<RepositoryCompare> {
  const id = encodeProjectId(projectId);
  return client.request<RepositoryCompare>("GET", `/projects/${id}/repository/compare`, {
    query: { from, to },
  });
}
