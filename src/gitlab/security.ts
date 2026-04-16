import type { GitlabClient } from "./client.js";
import { encodeProjectId } from "./encoding.js";
import type { VulnerabilityFinding } from "./types.js";

/** Project vulnerability findings (report_type varies by scanner). */
export async function listVulnerabilityFindings(
  client: GitlabClient,
  projectId: string | number,
  query?: Record<string, string | number | boolean | undefined>,
): Promise<VulnerabilityFinding[]> {
  const id = encodeProjectId(projectId);
  return client.requestAllPages<VulnerabilityFinding>(
    `/projects/${id}/vulnerability_findings`,
    query ?? {},
  );
}
