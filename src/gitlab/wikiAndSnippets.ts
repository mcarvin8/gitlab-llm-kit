import type { GitlabClient } from "./client.js";
import { encodeProjectId } from "./encoding.js";
import type { Snippet, WikiPage } from "./types.js";

export async function listWikiPages(
  client: GitlabClient,
  projectId: string | number,
): Promise<Array<{ format?: string; slug: string; title: string }>> {
  const id = encodeProjectId(projectId);
  return client.request("GET", `/projects/${id}/wikis`);
}

export async function getWikiPage(
  client: GitlabClient,
  projectId: string | number,
  slug: string,
  version?: string,
): Promise<WikiPage> {
  const id = encodeProjectId(projectId);
  const path = `/projects/${id}/wikis/${encodeURIComponent(slug)}`;
  return client.request<WikiPage>("GET", path, {
    query: version ? { version } : undefined,
  });
}

export async function listProjectSnippets(
  client: GitlabClient,
  projectId: string | number,
): Promise<Snippet[]> {
  const id = encodeProjectId(projectId);
  return client.requestAllPages<Snippet>(`/projects/${id}/snippets`);
}

export async function getSnippet(
  client: GitlabClient,
  snippetId: number,
): Promise<Snippet & { blob?: { raw_path?: string } }> {
  return client.request("GET", `/snippets/${snippetId}`);
}
