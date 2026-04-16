import type { LabflowLlm } from "../ai/types.js";
import { POLICY_DEFAULT, POLICY_SECURITY_FINDINGS } from "../ai/policies.js";
import { truncateForPrompt } from "../ai/textLimits.js";
import type { GitlabClient } from "../gitlab/client.js";
import { listVulnerabilityFindings } from "../gitlab/security.js";
import { listProjectAuditEvents } from "../gitlab/audit.js";

export async function aiVulnerabilityFindingsBrief(
  client: GitlabClient,
  llm: LabflowLlm,
  projectId: string | number,
  options?: { model?: string; maxPromptChars?: number },
): Promise<string> {
  const findings = await listVulnerabilityFindings(client, projectId);
  const text = findings
    .slice(0, 200)
    .map(
      (f, i) =>
        `${i + 1}. [${f.severity ?? "?"}] ${f.name ?? f.report_type ?? "finding"} — ${f.description ?? ""}`,
    )
    .join("\n");

  const user = truncateForPrompt(text, options?.maxPromptChars ?? 100_000);

  return llm({
    model: options?.model,
    system: `${POLICY_DEFAULT}\n${POLICY_SECURITY_FINDINGS}\nCluster findings, suggest triage order (not auto-fix). Markdown.`,
    user,
  });
}

export async function aiAuditEventsDashboardSummary(
  client: GitlabClient,
  llm: LabflowLlm,
  projectId: string | number,
  options?: { model?: string; maxPromptChars?: number },
): Promise<string> {
  const events = await listProjectAuditEvents(client, projectId);
  const text = events
    .slice(0, 200)
    .map(
      (e, i) =>
        `${i + 1}. ${e.created_at ?? ""} ${e.author?.username ?? "?"} — ${e.entity_type ?? "?"} ${JSON.stringify(e.details ?? {})}`,
    )
    .join("\n");

  const user = truncateForPrompt(text, options?.maxPromptChars ?? 100_000);

  return llm({
    model: options?.model,
    system: `${POLICY_DEFAULT}\nSummarize audit activity for a compliance dashboard (patterns, anomalies to review). Markdown.`,
    user,
  });
}
