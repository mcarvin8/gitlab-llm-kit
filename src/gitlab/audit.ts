import type { GitlabClient } from "./client.js";
import { encodeProjectId } from "./encoding.js";
import type { AuditEvent } from "./types.js";

export async function listProjectAuditEvents(
  client: GitlabClient,
  projectId: string | number,
  query?: Record<string, string | number | boolean | undefined>,
): Promise<AuditEvent[]> {
  const id = encodeProjectId(projectId);
  return client.requestAllPages<AuditEvent>(
    `/projects/${id}/audit_events`,
    query ?? {},
  );
}
