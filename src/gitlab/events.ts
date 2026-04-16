import type { GitlabClient } from "./client.js";
import { encodeGroupId, encodeProjectId } from "./encoding.js";
import type { Event } from "./types.js";

export async function listProjectEvents(
  client: GitlabClient,
  projectId: string | number,
  query?: Record<string, string | number | boolean | undefined>,
): Promise<Event[]> {
  const id = encodeProjectId(projectId);
  return client.requestAllPages<Event>(`/projects/${id}/events`, query ?? {});
}

export async function listGroupEvents(
  client: GitlabClient,
  groupId: string | number,
  query?: Record<string, string | number | boolean | undefined>,
): Promise<Event[]> {
  const gid = encodeGroupId(groupId);
  return client.requestAllPages<Event>(`/groups/${gid}/events`, query ?? {});
}
