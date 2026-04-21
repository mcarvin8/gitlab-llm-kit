import {
  generateSummary,
  type CommitInfo,
  type LlmModelProvider,
  type LlmProviderId,
  truncateUnifiedDiffForLlm,
  resolveLlmMaxDiffChars,
} from "@mcarvin/smart-diff";

import type { GitlabClient } from "../gitlab/client.js";
import {
  createMergeRequestNote,
  getMergeRequest,
  getMergeRequestChanges,
  listMergeRequestCommits,
} from "../gitlab/mergeRequests.js";

import { compareRefs } from "../gitlab/repository.js";

export type SummarizeGitLabMergeRequestDiffOptions = {
  client: GitlabClient;
  projectId: string | number;
  mergeRequestIid: number;
  /** Passed through to smart-diff (team line in prompt). */
  teamName?: string;
  /**
   * Explicit LLM provider id (OpenAI / Anthropic / Google / Bedrock / Mistral /
   * Cohere / Groq / xAI / DeepSeek / openai-compatible). Wins over
   * `LLM_PROVIDER` env + auto-detection.
   */
  provider?: LlmProviderId;
  model?: string;
  maxDiffChars?: number;
  /** Override default smart-diff system prompt. */
  systemPrompt?: string;
  /**
   * Hand-wire a Vercel AI SDK `LanguageModel` factory — bypasses smart-diff's
   * env-based provider resolution (useful in tests or for custom setups).
   */
  llmModelProvider?: LlmModelProvider;
  /** When true, POST the generated summary as a new merge request note (requires token with API write access). */
  postSummaryAsMergeRequestNote?: boolean;
};

function buildUnifiedDiffFromMrChanges(
  diffs: Array<{ old_path: string | null; new_path: string | null; diff: string }>,
): { diffText: string; fileNames: string[] } {
  const fileNames: string[] = [];
  const parts: string[] = [];

  for (const c of diffs) {
    const name =
      c.new_path ?? c.old_path ?? "unknown";
    fileNames.push(name);
    parts.push(
      `diff --git a/${c.old_path ?? "/dev/null"} b/${c.new_path ?? "/dev/null"}\n${c.diff}`,
    );
  }

  return { diffText: parts.join("\n"), fileNames };
}

/**
 * Summarize a merge request diff using `@mcarvin/smart-diff` (same pipeline as local `git diff`,
 * but fed from GitLab `/merge_requests/:iid/changes`). Enriches with MR title/branches in flags.
 */
export async function summarizeMergeRequestDiffWithSmartDiff(
  options: SummarizeGitLabMergeRequestDiffOptions,
): Promise<string> {
  const mr = await getMergeRequest(
    options.client,
    options.projectId,
    options.mergeRequestIid,
  );
  const [changes, commits] = await Promise.all([
    getMergeRequestChanges(options.client, options.projectId, options.mergeRequestIid),
    listMergeRequestCommits(options.client, options.projectId, options.mergeRequestIid),
  ]);

  const { diffText: rawDiff, fileNames } = buildUnifiedDiffFromMrChanges(
    changes.changes ?? [],
  );

  const commitInfos: CommitInfo[] = commits.map((c) => ({
    hash: c.id,
    message: c.message ?? c.title ?? "",
  }));

  const max = resolveLlmMaxDiffChars(options.maxDiffChars);
  const diffText = truncateUnifiedDiffForLlm(rawDiff, max);

  const from = mr.target_branch ?? "target";
  const to = mr.source_branch ?? "source";

  const summary = await generateSummary({
    diffText,
    fileNames,
    commits: commitInfos,
    flags: {
      from,
      to,
      team: options.teamName,
      model: options.model,
      provider: options.provider,
      maxDiffChars: options.maxDiffChars,
      systemPrompt: options.systemPrompt,
    },
    llmModelProvider: options.llmModelProvider,
  });

  if (options.postSummaryAsMergeRequestNote) {
    await createMergeRequestNote(options.client, options.projectId, options.mergeRequestIid, {
      body: summary,
    });
  }

  return summary;
}

export type SummarizeCompareDiffOptions = {
  client: GitlabClient;
  projectId: string | number;
  from: string;
  to: string;
  teamName?: string;
  provider?: LlmProviderId;
  model?: string;
  maxDiffChars?: number;
  systemPrompt?: string;
  llmModelProvider?: LlmModelProvider;
};

/** Like {@link summarizeMergeRequestDiffWithSmartDiff}, but for `/repository/compare`. */
export async function summarizeCompareDiffWithSmartDiff(
  options: SummarizeCompareDiffOptions,
): Promise<string> {
  const cmp = await compareRefs(options.client, options.projectId, options.from, options.to);
  const diffs = cmp.diffs ?? [];
  const { diffText: rawDiff, fileNames } = buildUnifiedDiffFromMrChanges(diffs);
  const commitInfos: CommitInfo[] = (cmp.commits ?? []).map((c) => ({
    hash: c.id,
    message: c.message ?? c.title ?? "",
  }));

  const max = resolveLlmMaxDiffChars(options.maxDiffChars);
  const diffText = truncateUnifiedDiffForLlm(rawDiff, max);

  return generateSummary({
    diffText,
    fileNames,
    commits: commitInfos,
    flags: {
      from: options.from,
      to: options.to,
      team: options.teamName,
      model: options.model,
      provider: options.provider,
      maxDiffChars: options.maxDiffChars,
      systemPrompt: options.systemPrompt,
    },
    llmModelProvider: options.llmModelProvider,
  });
}
