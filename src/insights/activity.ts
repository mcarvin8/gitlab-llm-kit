import type { LabflowLlm } from "../ai/types.js";
import { POLICY_DEFAULT } from "../ai/policies.js";
import { truncateForPrompt } from "../ai/textLimits.js";
import type { GitlabClient } from "../gitlab/client.js";
import { listGroupEvents, listProjectEvents } from "../gitlab/events.js";

function formatEvent(e: {
  action_name?: string;
  target_type?: string;
  target_title?: string;
  created_at?: string;
  author?: { username?: string };
}): string {
  return `[${e.created_at ?? ""}] ${e.author?.username ?? "?"} ${e.action_name ?? ""} ${e.target_type ?? ""} — ${e.target_title ?? ""}`;
}

/** Weekly-style digest; dedupe is LLM-assisted (caller should pre-filter if needed). */
export async function aiProjectWeeklyDigest(
  client: GitlabClient,
  llm: LabflowLlm,
  projectId: string | number,
  options?: { model?: string; maxPromptChars?: number },
): Promise<string> {
  const events = await listProjectEvents(client, projectId, { per_page: 100 });
  const raw = events.map(formatEvent).join("\n");
  const user = truncateForPrompt(raw, options?.maxPromptChars ?? 100_000);

  return llm({
    model: options?.model,
    system: `${POLICY_DEFAULT}\nWrite a concise weekly "what happened" digest for the project. Deduplicate noise. Markdown.`,
    user,
  });
}

export async function aiGroupWeeklyDigest(
  client: GitlabClient,
  llm: LabflowLlm,
  groupId: string | number,
  options?: { model?: string; maxPromptChars?: number },
): Promise<string> {
  const events = await listGroupEvents(client, groupId, { per_page: 100 });
  const raw = events.map(formatEvent).join("\n");
  const user = truncateForPrompt(raw, options?.maxPromptChars ?? 100_000);

  return llm({
    model: options?.model,
    system: `${POLICY_DEFAULT}\nWrite a concise weekly digest for the group. Markdown.`,
    user,
  });
}
