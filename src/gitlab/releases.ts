import type { GitlabClient } from "./client.js";
import { encodeProjectId } from "./encoding.js";
import type { Release } from "./types.js";

export async function getReleaseByTag(
  client: GitlabClient,
  projectId: string | number,
  tagName: string,
): Promise<Release> {
  const id = encodeProjectId(projectId);
  return client.request<Release>(
    "GET",
    `/projects/${id}/releases/${encodeURIComponent(tagName)}`,
  );
}

export async function listReleases(
  client: GitlabClient,
  projectId: string | number,
): Promise<Release[]> {
  const id = encodeProjectId(projectId);
  return client.requestAllPages<Release>(`/projects/${id}/releases`);
}
