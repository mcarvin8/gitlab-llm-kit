import type { LabflowLlm } from "../ai/types.js";
import { POLICY_DEFAULT } from "../ai/policies.js";
import { truncateForPrompt } from "../ai/textLimits.js";
import type { GitlabClient } from "../gitlab/client.js";
import {
  listDeployments,
  listEnvironments,
} from "../gitlab/deployments.js";

export async function aiPostDeployIncidentBrief(
  client: GitlabClient,
  llm: LabflowLlm,
  projectId: string | number,
  options?: { model?: string; maxPromptChars?: number; environment?: string; perPage?: number },
): Promise<string> {
  const deps = await listDeployments(client, projectId, {
    environment: options?.environment,
    per_page: options?.perPage ?? 30,
  });
  const envs = await listEnvironments(client, projectId);

  const block = [
    "## Recent deployments",
    ...deps
      .slice(0, 20)
      .map(
        (d) =>
          `- ${d.updated_at ?? d.created_at ?? ""} ${d.status} ${d.environment?.name ?? ""} ${d.sha ?? d.ref ?? ""}`,
      ),
    "## Environments",
    ...envs.map((e) => `- ${e.name}: ${e.state ?? ""}`),
  ].join("\n");

  const user = truncateForPrompt(block, options?.maxPromptChars ?? 60_000);

  return llm({
    model: options?.model,
    system: `${POLICY_DEFAULT}\nDraft a post-deploy incident brief scaffold: what shipped, what to watch, rollback hooks to verify. Not infra deep. Markdown.`,
    user,
  });
}
