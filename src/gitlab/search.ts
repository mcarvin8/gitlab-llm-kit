import type { GitlabClient } from "./client.js";

export type SearchScope =
  | "projects"
  | "issues"
  | "merge_requests"
  | "milestones"
  | "snippet_titles"
  | "wiki_blobs"
  | "commits"
  | "blobs";

/** Global search (optionally scoped to a project or group). */
export async function searchGitlab(
  client: GitlabClient,
  options: {
    scope: SearchScope;
    search: string;
    projectId?: string | number;
    groupId?: string | number;
    additional?: Record<string, string | number | boolean | undefined>;
  },
): Promise<unknown[]> {
  const query: Record<string, string | number | boolean | undefined> = {
    scope: options.scope,
    search: options.search,
    ...options.additional,
  };
  if (options.projectId !== undefined) {
    query.project_id = options.projectId;
  }
  if (options.groupId !== undefined) {
    query.group_id = options.groupId;
  }
  return client.requestAllPages<unknown>("/search", query);
}

export async function searchInProject(
  client: GitlabClient,
  projectId: string | number,
  scope: SearchScope,
  search: string,
): Promise<unknown[]> {
  return searchGitlab(client, {
    scope,
    search,
    projectId,
  });
}

export async function searchInGroup(
  client: GitlabClient,
  groupId: string | number,
  scope: SearchScope,
  search: string,
): Promise<unknown[]> {
  return searchGitlab(client, {
    scope,
    search,
    groupId,
  });
}
