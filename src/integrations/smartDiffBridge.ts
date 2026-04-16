import {
  createOpenAiLikeClient,
  generateSummary,
  type CommitInfo,
  type OpenAiLikeClient,
  truncateUnifiedDiffForLlm,
  resolveLlmMaxDiffChars,
} from "@mcarvin/smart-diff";

import type { GitlabClient } from "../gitlab/client.js";
import {
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
  model?: string;
  maxDiffChars?: number;
  /** Override default smart-diff system prompt. */
  systemPrompt?: string;
  /** When set, uses this instead of `createOpenAiLikeClient()` from env. */
  openAiClientProvider?: () => Promise<OpenAiLikeClient>;
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

  const provider =
    options.openAiClientProvider ?? (() => createOpenAiLikeClient());

  return generateSummary({
    diffText,
    fileNames,
    commits: commitInfos,
    flags: {
      from,
      to,
      team: options.teamName,
      model: options.model,
      maxDiffChars: options.maxDiffChars,
      systemPrompt: options.systemPrompt,
    },
    openAiClientProvider: provider,
  });
}

export type SummarizeCompareDiffOptions = {
  client: GitlabClient;
  projectId: string | number;
  from: string;
  to: string;
  teamName?: string;
  model?: string;
  maxDiffChars?: number;
  systemPrompt?: string;
  openAiClientProvider?: () => Promise<OpenAiLikeClient>;
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
  const provider =
    options.openAiClientProvider ?? (() => createOpenAiLikeClient());

  return generateSummary({
    diffText,
    fileNames,
    commits: commitInfos,
    flags: {
      from: options.from,
      to: options.to,
      team: options.teamName,
      model: options.model,
      maxDiffChars: options.maxDiffChars,
      systemPrompt: options.systemPrompt,
    },
    openAiClientProvider: provider,
  });
}
