import type { GitlabClient } from "./client.js";
import { GitlabHttpError } from "./errors.js";
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

export type UpsertReleaseParams = {
  description: string;
  /** Display name in GitLab. When creating a release, defaults to `tagName` if omitted. */
  name?: string;
  /**
   * When **creating** a release and the Git tag does not exist yet, branch or commit SHA to create it from.
   * Omit if the tag already exists in the repository.
   */
  ref?: string;
};

/**
 * Create or update a project release for `tagName`.
 * If no release exists for the tag, `POST` is used; otherwise `PUT`. Requires API token with write access.
 */
export async function upsertRelease(
  client: GitlabClient,
  projectId: string | number,
  tagName: string,
  params: UpsertReleaseParams,
): Promise<Release> {
  const id = encodeProjectId(projectId);
  const pathTag = encodeURIComponent(tagName);

  let existing: Release | null = null;
  try {
    existing = await getReleaseByTag(client, projectId, tagName);
  } catch (e) {
    if (e instanceof GitlabHttpError && e.status === 404) {
      existing = null;
    } else {
      throw e;
    }
  }

  if (existing) {
    return client.request<Release>("PUT", `/projects/${id}/releases/${pathTag}`, {
      body: {
        description: params.description,
        ...(params.name !== undefined ? { name: params.name } : {}),
      },
    });
  }

  return client.request<Release>("POST", `/projects/${id}/releases`, {
    body: {
      tag_name: tagName,
      description: params.description,
      name: params.name ?? tagName,
      ...(params.ref !== undefined ? { ref: params.ref } : {}),
    },
  });
}
