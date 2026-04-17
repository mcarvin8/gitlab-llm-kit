import type { GitlabClient } from "./client.js";
import { encodeProjectId } from "./encoding.js";
import type { Pipeline, PipelineJob } from "./types.js";

export async function listPipelines(
  client: GitlabClient,
  projectId: string | number,
  query?: Record<string, string | number | boolean | undefined>,
): Promise<Pipeline[]> {
  const id = encodeProjectId(projectId);
  return client.requestAllPages<Pipeline>(`/projects/${id}/pipelines`, query ?? {});
}

export async function getPipeline(
  client: GitlabClient,
  projectId: string | number,
  pipelineId: number,
): Promise<Pipeline> {
  const id = encodeProjectId(projectId);
  return client.request<Pipeline>("GET", `/projects/${id}/pipelines/${pipelineId}`);
}

export async function listPipelineJobs(
  client: GitlabClient,
  projectId: string | number,
  pipelineId: number,
  query?: Record<string, string | number | boolean | undefined>,
): Promise<PipelineJob[]> {
  const id = encodeProjectId(projectId);
  return client.requestAllPages<PipelineJob>(
    `/projects/${id}/pipelines/${pipelineId}/jobs`,
    query ?? {},
  );
}

export async function getJob(
  client: GitlabClient,
  projectId: string | number,
  jobId: number,
): Promise<PipelineJob> {
  const id = encodeProjectId(projectId);
  return client.request<PipelineJob>("GET", `/projects/${id}/jobs/${jobId}`);
}

/**
 * Raw CI job log / trace (plain text).
 * See [Get a log file](https://docs.gitlab.com/ee/api/jobs.html#get-a-log-file).
 */
export async function getJobTrace(
  client: GitlabClient,
  projectId: string | number,
  jobId: number,
): Promise<string> {
  const id = encodeProjectId(projectId);
  return client.requestText("GET", `/projects/${id}/jobs/${jobId}/trace`);
}
