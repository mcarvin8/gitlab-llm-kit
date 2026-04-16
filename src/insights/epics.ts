import type { LabflowLlm } from "../ai/types.js";
import { POLICY_DEFAULT } from "../ai/policies.js";
import { truncateForPrompt } from "../ai/textLimits.js";
import type { GitlabClient } from "../gitlab/client.js";
import { getEpic, listEpicIssues } from "../gitlab/epics.js";

export async function aiEpicRoadmapRollup(
  client: GitlabClient,
  llm: LabflowLlm,
  groupId: string | number,
  epicIid: number,
  options?: { model?: string; maxPromptChars?: number },
): Promise<string> {
  const epic = await getEpic(client, groupId, epicIid);
  const issues = await listEpicIssues(client, groupId, epicIid);

  const head = `${epic.title}\n${epic.description ?? ""}\nState: ${epic.state ?? ""}`;
  const issueLines = issues
    .map((i) => `- #${i.iid} ${i.title} (${i.state ?? "?"})`)
    .join("\n");

  const user = truncateForPrompt(
    `${head}\n\n## Child issues\n${issueLines}`,
    options?.maxPromptChars ?? 80_000,
  );

  return llm({
    model: options?.model,
    system: `${POLICY_DEFAULT}\nProduce a roadmap-style rollup: status themes, dependencies, risks, suggested sequencing. Markdown.`,
    user,
  });
}
