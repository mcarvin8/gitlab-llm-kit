/** Encode a project id or path for use in `/projects/:id/...` URLs. */
export function encodeProjectId(projectId: string | number): string {
  return encodeURIComponent(String(projectId));
}

/** Encode a group id or path for `/groups/:id/...` URLs. */
export function encodeGroupId(groupId: string | number): string {
  return encodeURIComponent(String(groupId));
}
