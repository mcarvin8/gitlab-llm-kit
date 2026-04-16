import type { GitlabClient } from "./client.js";
import { encodeProjectId } from "./encoding.js";
import type { Project } from "./types.js";
import { getFile } from "./repository.js";

export async function getProject(
  client: GitlabClient,
  projectId: string | number,
): Promise<Project> {
  const id = encodeProjectId(projectId);
  return client.request<Project>("GET", `/projects/${id}`);
}

/** Fetch README (or any doc) via Repository Files API — scrub secrets before sending to models. */
export function getReadmeFile(
  client: GitlabClient,
  projectId: string | number,
  filePath: string,
  ref: string,
): ReturnType<typeof getFile> {
  return getFile(client, projectId, filePath, ref);
}
