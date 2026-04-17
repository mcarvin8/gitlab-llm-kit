import type { LabflowLlm } from "../ai/types.js";
import { POLICY_DEFAULT, POLICY_NO_SECRET_EXFILTRATION } from "../ai/policies.js";
import { truncateForPrompt } from "../ai/textLimits.js";
import type { GitlabClient } from "../gitlab/client.js";
import {
  getSnippet,
  getWikiPage,
  listWikiPages,
  upsertWikiPage,
} from "../gitlab/wikiAndSnippets.js";

/** Optional LLM + wiki publish fields shared by wiki insight helpers. */
export type AiWikiInsightOptions = {
  model?: string;
  maxPromptChars?: number;
  /**
   * When set, writes the generated markdown to this wiki page slug via `upsertWikiPage` (requires API token with write access).
   * Use a slug different from the source page if you must not overwrite the full runbook with a short TL;DR.
   */
  postSummaryToWikiSlug?: string;
  wikiPageTitle?: string;
  wikiFormat?: string;
};

export type AiWikiRunbookTldrOptions = AiWikiInsightOptions & {
  wikiVersion?: string;
};

async function maybePostWikiInsight(
  client: GitlabClient,
  projectId: string | number,
  slug: string | undefined,
  summary: string,
  title: string | undefined,
  format: string | undefined,
): Promise<void> {
  if (!slug) {
    return;
  }
  await upsertWikiPage(client, projectId, slug, {
    content: summary,
    title,
    format,
  });
}

export async function aiWikiRunbookTldr(
  client: GitlabClient,
  llm: LabflowLlm,
  projectId: string | number,
  slug: string,
  options?: AiWikiRunbookTldrOptions,
): Promise<string> {
  const page = await getWikiPage(client, projectId, slug, options?.wikiVersion);
  const user = truncateForPrompt(page.content ?? "", options?.maxPromptChars ?? 80_000);

  const summary = await llm({
    model: options?.model,
    system: `${POLICY_DEFAULT}\n${POLICY_NO_SECRET_EXFILTRATION}\nTL;DR this runbook for on-call: steps, rollback, links to verify. Markdown.`,
    user,
  });

  await maybePostWikiInsight(
    client,
    projectId,
    options?.postSummaryToWikiSlug,
    summary,
    options?.wikiPageTitle,
    options?.wikiFormat,
  );
  return summary;
}

export type AiWikiOutdatedDocHintsOptions = AiWikiInsightOptions & {
  sampleSlugs?: string[];
};

/** Heuristic doc review when given wiki index + optional sample pages. */
export async function aiWikiOutdatedDocHints(
  client: GitlabClient,
  llm: LabflowLlm,
  projectId: string | number,
  options?: AiWikiOutdatedDocHintsOptions,
): Promise<string> {
  const index = await listWikiPages(client, projectId);
  const slugs = options?.sampleSlugs ?? index.slice(0, 5).map((p) => p.slug);
  const samples: string[] = [];
  for (const slug of slugs) {
    const page = await getWikiPage(client, projectId, slug).catch(() => null);
    if (page?.content) {
      samples.push(`## ${slug}\n${page.content.slice(0, 8000)}`);
    }
  }

  const user = truncateForPrompt(
    `Wiki titles:\n${index.map((p) => `- ${p.slug}: ${p.title}`).join("\n")}\n\nSamples:\n${samples.join("\n\n")}`,
    options?.maxPromptChars ?? 100_000,
  );

  const summary = await llm({
    model: options?.model,
    system: `${POLICY_DEFAULT}\n${POLICY_NO_SECRET_EXFILTRATION}\nFlag likely outdated sections, conflicts, or missing runbook elements (not guaranteed). Markdown.`,
    user,
  });

  await maybePostWikiInsight(
    client,
    projectId,
    options?.postSummaryToWikiSlug,
    summary,
    options?.wikiPageTitle,
    options?.wikiFormat,
  );
  return summary;
}

export async function aiSnippetTldr(
  client: GitlabClient,
  llm: LabflowLlm,
  snippetId: number,
  options?: { model?: string; maxPromptChars?: number },
): Promise<string> {
  const sn = await getSnippet(client, snippetId);
  const user = truncateForPrompt(
    `${sn.title}\n${sn.description ?? ""}\n${JSON.stringify(sn)}`,
    options?.maxPromptChars ?? 40_000,
  );

  return llm({
    model: options?.model,
    system: `${POLICY_DEFAULT}\n${POLICY_NO_SECRET_EXFILTRATION}\nSummarize snippet purpose and safe usage. Markdown.`,
    user,
  });
}

export async function aiSuggestMergeWikiPages(
  client: GitlabClient,
  llm: LabflowLlm,
  projectId: string | number,
  options?: AiWikiInsightOptions,
): Promise<string> {
  const index = await listWikiPages(client, projectId);
  const user = truncateForPrompt(
    index.map((p) => `- ${p.slug}: ${p.title}`).join("\n"),
    options?.maxPromptChars ?? 40_000,
  );

  const summary = await llm({
    model: options?.model,
    system: `${POLICY_DEFAULT}\nSuggest pages that may overlap or should merge (outline only). Markdown.`,
    user,
  });

  await maybePostWikiInsight(
    client,
    projectId,
    options?.postSummaryToWikiSlug,
    summary,
    options?.wikiPageTitle,
    options?.wikiFormat,
  );
  return summary;
}
