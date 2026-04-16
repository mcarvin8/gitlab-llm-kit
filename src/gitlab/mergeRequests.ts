import type { GitlabClient } from "./client.js";
import { encodeProjectId } from "./encoding.js";
import type {
  Commit,
  MergeRequest,
  MergeRequestChanges,
  Note,
} from "./types.js";

export async function getMergeRequest(
  client: GitlabClient,
  projectId: string | number,
  mergeRequestIid: number,
): Promise<MergeRequest> {
  const id = encodeProjectId(projectId);
  return client.request<MergeRequest>(
    "GET",
    `/projects/${id}/merge_requests/${mergeRequestIid}`,
  );
}

export async function listMergeRequestNotes(
  client: GitlabClient,
  projectId: string | number,
  mergeRequestIid: number,
): Promise<Note[]> {
  const id = encodeProjectId(projectId);
  return client.requestAllPages<Note>(
    `/projects/${id}/merge_requests/${mergeRequestIid}/notes`,
  );
}

export async function getMergeRequestChanges(
  client: GitlabClient,
  projectId: string | number,
  mergeRequestIid: number,
): Promise<MergeRequestChanges> {
  const id = encodeProjectId(projectId);
  return client.request<MergeRequestChanges>(
    "GET",
    `/projects/${id}/merge_requests/${mergeRequestIid}/changes`,
  );
}

export async function listMergeRequestCommits(
  client: GitlabClient,
  projectId: string | number,
  mergeRequestIid: number,
): Promise<Commit[]> {
  const id = encodeProjectId(projectId);
  return client.requestAllPages<Commit>(
    `/projects/${id}/merge_requests/${mergeRequestIid}/commits`,
  );
}

export async function listMergeRequestDiscussions(
  client: GitlabClient,
  projectId: string | number,
  mergeRequestIid: number,
): Promise<
  Array<{
    id: string;
    individual_note: boolean;
    notes?: Note[];
  }>
> {
  const id = encodeProjectId(projectId);
  return client.requestAllPages(`/projects/${id}/merge_requests/${mergeRequestIid}/discussions`);
}
