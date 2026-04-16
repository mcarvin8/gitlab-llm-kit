import type { LabflowLlm } from "../ai/types.js";
import { POLICY_DEFAULT, POLICY_NO_SECRET_EXFILTRATION } from "../ai/policies.js";
import { truncateForPrompt } from "../ai/textLimits.js";
import type { GitlabClient } from "../gitlab/client.js";
import { getProject, getReadmeFile } from "../gitlab/projectMeta.js";

export async function aiProjectReadmeConsistency(
  client: GitlabClient,
  llm: LabflowLlm,
  projectId: string | number,
  options?: { model?: string; maxPromptChars?: number; readmePath?: string; ref?: string },
): Promise<string> {
  const project = await getProject(client, projectId);
  const ref = options?.ref ?? project.default_branch ?? "main";
  const readmePath = options?.readmePath ?? "README.md";
  let readmeBody = "";
  try {
    const blob = await getReadmeFile(client, projectId, readmePath, ref);
    readmeBody =
      blob.encoding === "base64" && blob.content
        ? Buffer.from(blob.content, "base64").toString("utf8").slice(0, 60_000)
        : (blob.content ?? "");
  } catch {
    readmeBody = "(README not fetched — check branch/path permissions)";
  }

  const meta =
    [
      `Name: ${project.name ?? ""}`,
      `Path: ${project.path_with_namespace ?? ""}`,
      `Description: ${project.description ?? ""}`,
      `Topics: ${(project.topics ?? []).join(", ")}`,
      `Default branch: ${project.default_branch ?? ""}`,
      `Web: ${project.web_url ?? ""}`,
    ].join("\n");

  const user = truncateForPrompt(
    `${meta}\n\n## README (${readmePath} @ ${ref})\n${readmeBody}`,
    options?.maxPromptChars ?? 100_000,
  );

  return llm({
    model: options?.model,
    system: `${POLICY_DEFAULT}\n${POLICY_NO_SECRET_EXFILTRATION}\nCheck alignment between project metadata and README for onboarding blurbs (gaps, contradictions). Markdown.`,
    user,
  });
}
