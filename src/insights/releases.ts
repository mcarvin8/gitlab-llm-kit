import type { LabflowLlm } from "../ai/types.js";
import { POLICY_DEFAULT } from "../ai/policies.js";
import { truncateForPrompt } from "../ai/textLimits.js";
import type { GitlabClient } from "../gitlab/client.js";
import {
  compareRefs,
  listCommits,
} from "../gitlab/repository.js";
import { getReleaseByTag, listReleases, upsertRelease } from "../gitlab/releases.js";

export type AiDraftReleaseNotesOptions = {
  model?: string;
  maxPromptChars?: number;
  priorTag?: string;
  /**
   * When true, create or update the GitLab release for `tagName` with the generated markdown as `description`.
   * Requires token with API write access (same privilege story as MR/issue notes).
   */
  postSummaryAsReleaseDescription?: boolean;
  /** When creating a release and the Git tag does not exist yet, branch or SHA for `upsertRelease`. */
  releaseRef?: string;
  /** Display name for a newly created release; optional. */
  releaseName?: string;
};

export async function aiDraftReleaseNotes(
  client: GitlabClient,
  llm: LabflowLlm,
  projectId: string | number,
  tagName: string,
  options?: AiDraftReleaseNotesOptions,
): Promise<string> {
  const release = await getReleaseByTag(client, projectId, tagName).catch(
    () => null,
  );
  const prior = options?.priorTag;

  let commitText = "";
  if (prior) {
    const cmp = await compareRefs(client, projectId, prior, tagName);
    const commits = cmp.commits ?? [];
    commitText = commits
      .map((c) => `- ${c.id.slice(0, 8)} ${(c.message ?? "").split("\n")[0]}`)
      .join("\n");
  } else {
    const commits = await listCommits(client, projectId, { ref_name: tagName });
    commitText = commits
      .slice(0, 50)
      .map((c) => `- ${c.id.slice(0, 8)} ${(c.message ?? "").split("\n")[0]}`)
      .join("\n");
  }

  const relDesc = release?.description ?? "(no release description on GitLab)";
  const user = truncateForPrompt(
    `Tag: ${tagName}\nExisting GitLab release notes:\n${relDesc}\n\nCommits in window:\n${commitText}`,
    options?.maxPromptChars ?? 100_000,
  );

  const summary = await llm({
    model: options?.model,
    system: `${POLICY_DEFAULT}\nDraft improved release notes for humans: highlights, breaking changes if any, upgrade hints. This is a draft. Markdown.`,
    user,
  });

  if (options?.postSummaryAsReleaseDescription) {
    await upsertRelease(client, projectId, tagName, {
      description: summary,
      ref: options.releaseRef,
      name: options.releaseName,
    });
  }

  return summary;
}

export async function aiListReleasesOverview(
  client: GitlabClient,
  llm: LabflowLlm,
  projectId: string | number,
  options?: { model?: string; maxPromptChars?: number },
): Promise<string> {
  const list = await listReleases(client, projectId);
  const brief = list
    .slice(0, 30)
    .map((r) => `- ${r.tag_name}: ${r.name} (${r.released_at ?? r.created_at ?? ""})`)
    .join("\n");

  const user = truncateForPrompt(brief, options?.maxPromptChars ?? 40_000);

  return llm({
    model: options?.model,
    system: `${POLICY_DEFAULT}\nSummarize release cadence and naming patterns briefly. Markdown.`,
    user,
  });
}
