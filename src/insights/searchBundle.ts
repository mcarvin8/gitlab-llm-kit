import type { LabflowLlm } from "../ai/types.js";
import { POLICY_DEFAULT } from "../ai/policies.js";
import { truncateForPrompt } from "../ai/textLimits.js";
import type { GitlabClient } from "../gitlab/client.js";
import { searchInProject, type SearchScope } from "../gitlab/search.js";

/** Pull search results as raw JSON, then compress into an "everything mentioning X" briefing. */
export async function aiSearchMentionBundle(
  client: GitlabClient,
  llm: LabflowLlm,
  projectId: string | number,
  scope: SearchScope,
  search: string,
  options?: { model?: string; maxPromptChars?: number },
): Promise<string> {
  const hits = await searchInProject(client, projectId, scope, search);
  const user = truncateForPrompt(
    JSON.stringify({ scope, search, hits }, null, 2),
    options?.maxPromptChars ?? 120_000,
  );

  return llm({
    model: options?.model,
    system: `${POLICY_DEFAULT}\nSummarize what these GitLab search hits imply (incident timeline starter, not authoritative). Markdown.`,
    user,
  });
}
