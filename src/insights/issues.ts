import type { LabflowLlm } from "../ai/types.js";
import { POLICY_DEFAULT } from "../ai/policies.js";
import { truncateForPrompt } from "../ai/textLimits.js";
import type { GitlabClient } from "../gitlab/client.js";
import { getIssue, listIssueNotes, listProjectIssues } from "../gitlab/issues.js";
import type { Issue } from "../gitlab/types.js";

function formatIssueHeader(issue: Issue): string {
  const labels = Array.isArray(issue.labels)
    ? issue.labels.map((l) => (typeof l === "string" ? l : l.name))
    : [];
  return [
    `Title: ${issue.title}`,
    issue.description ?? "",
    `State: ${issue.state}`,
    labels.length ? `Labels: ${labels.join(", ")}` : "",
    issue.web_url ? `URL: ${issue.web_url}` : "",
    issue.created_at ? `Created: ${issue.created_at}` : "",
    issue.updated_at ? `Updated: ${issue.updated_at}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function formatNote(n: { body?: string; author?: { username?: string; name?: string }; created_at?: string }): string {
  const who = n.author?.username ?? n.author?.name ?? "?";
  return `[${n.created_at ?? ""}] @${who}: ${n.body ?? ""}`;
}

export async function aiIssueThreadSummary(
  client: GitlabClient,
  llm: LabflowLlm,
  projectId: string | number,
  issueIid: number,
  options?: { model?: string; maxPromptChars?: number },
): Promise<string> {
  const issue = await getIssue(client, projectId, issueIid);
  const notes = await listIssueNotes(client, projectId, issueIid);
  const user = truncateForPrompt(
    `${formatIssueHeader(issue)}\n\n## Comments\n${notes.map(formatNote).join("\n\n")}`,
    options?.maxPromptChars ?? 100_000,
  );

  return llm({
    model: options?.model,
    system: `${POLICY_DEFAULT}\nSummarize a long issue thread: decisions, blockers, next steps. Markdown.`,
    user,
  });
}

export async function aiStaleIssueSummary(
  client: GitlabClient,
  llm: LabflowLlm,
  projectId: string | number,
  issueIid: number,
  options?: { model?: string; maxPromptChars?: number },
): Promise<string> {
  const issue = await getIssue(client, projectId, issueIid);
  const notes = await listIssueNotes(client, projectId, issueIid);
  const user = truncateForPrompt(
    `${formatIssueHeader(issue)}\n\n## Comments\n${notes.map(formatNote).join("\n\n")}`,
    options?.maxPromptChars ?? 100_000,
  );

  return llm({
    model: options?.model,
    system: `${POLICY_DEFAULT}\nAssess staleness: lastactivity, unclear ownership, recommended ping or close criteria. Markdown.`,
    user,
  });
}

export async function aiIssueSuggestedNextStep(
  client: GitlabClient,
  llm: LabflowLlm,
  projectId: string | number,
  issueIid: number,
  options?: { model?: string; maxPromptChars?: number },
): Promise<string> {
  const issue = await getIssue(client, projectId, issueIid);
  const notes = await listIssueNotes(client, projectId, issueIid);
  const user = truncateForPrompt(
    `${formatIssueHeader(issue)}\n\n## Comments\n${notes.map(formatNote).join("\n\n")}`,
    options?.maxPromptChars ?? 100_000,
  );

  return llm({
    model: options?.model,
    system: `${POLICY_DEFAULT}\nPropose the smallest next step toward resolution and closure criteria. Markdown checklist.`,
    user,
  });
}

/** Scan open issues for likely stale work (heuristic; then optionally batch LLM per issue). */
export async function listOpenIssuesForProject(
  client: GitlabClient,
  projectId: string | number,
  state: "opened" | "closed" = "opened",
): Promise<Issue[]> {
  return listProjectIssues(client, projectId, { state });
}
