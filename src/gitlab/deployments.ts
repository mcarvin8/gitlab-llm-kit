import type { GitlabClient } from "./client.js";
import { encodeProjectId } from "./encoding.js";
import type { Deployment, Environment } from "./types.js";

export async function listDeployments(
  client: GitlabClient,
  projectId: string | number,
  query?: Record<string, string | number | boolean | undefined>,
): Promise<Deployment[]> {
  const id = encodeProjectId(projectId);
  return client.requestAllPages<Deployment>(
    `/projects/${id}/deployments`,
    query ?? {},
  );
}

export async function listEnvironments(
  client: GitlabClient,
  projectId: string | number,
): Promise<Environment[]> {
  const id = encodeProjectId(projectId);
  return client.requestAllPages<Environment>(`/projects/${id}/environments`);
}
