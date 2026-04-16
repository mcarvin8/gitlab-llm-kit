import type { GitlabClient } from "./client.js";
import { encodeGroupId } from "./encoding.js";
import type { Epic } from "./types.js";

export async function getEpic(
  client: GitlabClient,
  groupId: string | number,
  epicIid: number,
): Promise<Epic> {
  const gid = encodeGroupId(groupId);
  return client.request<Epic>("GET", `/groups/${gid}/epics/${epicIid}`);
}

export async function listEpicIssues(
  client: GitlabClient,
  groupId: string | number,
  epicIid: number,
): Promise<
  Array<{
    id: number;
    iid: number;
    title: string;
    state?: string;
    web_url?: string;
  }>
> {
  const gid = encodeGroupId(groupId);
  return client.requestAllPages(
    `/groups/${gid}/epics/${epicIid}/issues`,
  );
}

export async function listGroupEpics(
  client: GitlabClient,
  groupId: string | number,
  query?: Record<string, string | number | boolean | undefined>,
): Promise<Epic[]> {
  const gid = encodeGroupId(groupId);
  return client.requestAllPages<Epic>(`/groups/${gid}/epics`, query ?? {});
}
