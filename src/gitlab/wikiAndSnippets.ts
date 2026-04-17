import type { GitlabClient } from "./client.js";
import { GitlabHttpError } from "./errors.js";
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

export type CreateWikiPageParams = {
  title: string;
  content: string;
  /** Default when omitted: `markdown`. */
  format?: string;
};

/** Create a wiki page (`POST /projects/:id/wikis`). Requires API token with write access. */
export async function createWikiPage(
  client: GitlabClient,
  projectId: string | number,
  params: CreateWikiPageParams,
): Promise<WikiPage> {
  const id = encodeProjectId(projectId);
  return client.request<WikiPage>("POST", `/projects/${id}/wikis`, {
    body: {
      title: params.title,
      content: params.content,
      ...(params.format !== undefined ? { format: params.format } : {}),
    },
  });
}

export type UpdateWikiPageParams = {
  content?: string;
  title?: string;
  format?: string;
};

/** Update a wiki page by slug (`PUT /projects/:id/wikis/:slug`). Requires API token with write access. */
export async function updateWikiPage(
  client: GitlabClient,
  projectId: string | number,
  slug: string,
  params: UpdateWikiPageParams,
): Promise<WikiPage> {
  const id = encodeProjectId(projectId);
  const path = `/projects/${id}/wikis/${encodeURIComponent(slug)}`;
  const body: Record<string, string> = {};
  if (params.content !== undefined) {
    body.content = params.content;
  }
  if (params.title !== undefined) {
    body.title = params.title;
  }
  if (params.format !== undefined) {
    body.format = params.format;
  }
  return client.request<WikiPage>("PUT", path, { body });
}

export type UpsertWikiPageParams = {
  content: string;
  /** Used when creating a new page; defaults to `slug` if omitted. */
  title?: string;
  format?: string;
};

/**
 * Create or update a wiki page at `slug`: `GET` first; on 404 `POST` (create), else `PUT` (update).
 * GitLab derives the URL slug from `title` on create; pass a `title` consistent with the desired slug.
 */
export async function upsertWikiPage(
  client: GitlabClient,
  projectId: string | number,
  slug: string,
  params: UpsertWikiPageParams,
): Promise<WikiPage> {
  let existing: WikiPage | null = null;
  try {
    existing = await getWikiPage(client, projectId, slug);
  } catch (e) {
    if (e instanceof GitlabHttpError && e.status === 404) {
      existing = null;
    } else {
      throw e;
    }
  }

  if (existing) {
    return updateWikiPage(client, projectId, slug, {
      content: params.content,
      ...(params.title !== undefined ? { title: params.title } : {}),
      ...(params.format !== undefined ? { format: params.format } : {}),
    });
  }

  return createWikiPage(client, projectId, {
    title: params.title ?? slug,
    content: params.content,
    format: params.format,
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
