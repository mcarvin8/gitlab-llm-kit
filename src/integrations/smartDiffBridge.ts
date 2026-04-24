import {
  generateSummary,
  type CommitInfo,
  type DiffShapingOptions,
  type LlmModelProvider,
  type LlmProviderId,
  truncateUnifiedDiffForLlm,
  resolveLlmMaxDiffChars,
  shapeUnifiedDiff,
  DEFAULT_NOISE_EXCLUDES,
} from "@mcarvin/smart-diff";

import type { GitlabClient } from "../gitlab/client.js";
import {
  createMergeRequestNote,
  getMergeRequest,
  getMergeRequestChanges,
  listMergeRequestCommits,
} from "../gitlab/mergeRequests.js";

import { compareRefs } from "../gitlab/repository.js";

type MrDiffFile = {
  old_path: string | null;
  new_path: string | null;
  diff: string;
};

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
  /**
   * smart-diff v2.1+ unified-diff token-reduction controls. The GitLab
   * `/changes` and `/compare` endpoints return a pre-rendered unified diff,
   * so only `stripDiffPreamble` and `maxHunkLines` affect the bridge output
   * (`contextLines` and `ignoreWhitespace` are git-arg flags and apply only
   * to the local `summarizeGitDiff` pipeline).
   */
  diffShaping?: DiffShapingOptions;
  /**
   * Drop files whose path matches smart-diff's built-in noise list
   * (`DEFAULT_NOISE_EXCLUDES`: lockfiles, `node_modules`, `dist`, `build`,
   * `out`, `coverage`, `__snapshots__`). Combines with `excludeFolders`.
   */
  excludeDefaultNoise?: boolean;
  /**
   * Keep only files whose path matches one of these segments (folder name,
   * file basename, or prefix). Empty / omitted means "keep all". Matching is
   * substring-based on `/`-delimited path segments.
   */
  includeFolders?: string[];
  /**
   * Drop files whose path matches one of these segments (folder name, file
   * basename, or prefix). Combines with `excludeDefaultNoise`.
   */
  excludeFolders?: string[];
};

function normalizePatterns(patterns: readonly string[] | undefined): string[] {
  if (!patterns || patterns.length === 0) return [];
  const out: string[] = [];
  for (const raw of patterns) {
    if (typeof raw !== "string") continue;
    const trimmed = raw.trim().replace(/^\.\//, "").replace(/^\/+|\/+$/g, "");
    if (trimmed) out.push(trimmed);
  }
  return out;
}

function pathMatchesSegment(path: string, segment: string): boolean {
  if (!path || !segment) return false;
  if (path === segment) return true;
  if (path.startsWith(`${segment}/`)) return true;
  if (path.includes(`/${segment}/`)) return true;
  const basename = path.slice(path.lastIndexOf("/") + 1);
  return basename === segment;
}

function pathMatchesAny(path: string, segments: string[]): boolean {
  for (const s of segments) {
    if (pathMatchesSegment(path, s)) return true;
  }
  return false;
}

type PathFilter = {
  includes: string[];
  excludes: string[];
};

function buildPathFilter(
  options: Pick<
    SummarizeGitLabMergeRequestDiffOptions,
    "includeFolders" | "excludeFolders" | "excludeDefaultNoise"
  >,
): PathFilter {
  const includes = normalizePatterns(options.includeFolders);
  const excludes = normalizePatterns(options.excludeFolders);
  if (options.excludeDefaultNoise) {
    for (const noise of DEFAULT_NOISE_EXCLUDES) {
      if (!excludes.includes(noise)) excludes.push(noise);
    }
  }
  return { includes, excludes };
}

function filterDiffFiles(diffs: MrDiffFile[], filter: PathFilter): MrDiffFile[] {
  if (filter.includes.length === 0 && filter.excludes.length === 0) return diffs;
  return diffs.filter((c) => {
    const newPath = c.new_path ?? "";
    const oldPath = c.old_path ?? "";
    const candidatePaths = [newPath, oldPath].filter((p): p is string => p.length > 0);
    if (candidatePaths.length === 0) return true;
    if (filter.excludes.length > 0) {
      const allExcluded = candidatePaths.every((p) => pathMatchesAny(p, filter.excludes));
      if (allExcluded) return false;
    }
    if (filter.includes.length > 0) {
      const anyIncluded = candidatePaths.some((p) => pathMatchesAny(p, filter.includes));
      if (!anyIncluded) return false;
    }
    return true;
  });
}

function buildUnifiedDiffFromMrChanges(
  diffs: MrDiffFile[],
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

  const filter = buildPathFilter(options);
  const filteredChanges = filterDiffFiles(changes.changes ?? [], filter);
  const { diffText: rawDiff, fileNames } = buildUnifiedDiffFromMrChanges(filteredChanges);

  const commitInfos: CommitInfo[] = commits.map((c) => ({
    hash: c.id,
    message: c.message ?? c.title ?? "",
  }));

  const shaped = shapeUnifiedDiff(rawDiff, options.diffShaping);
  const max = resolveLlmMaxDiffChars(options.maxDiffChars);
  const diffText = truncateUnifiedDiffForLlm(shaped, max);

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
  /** See {@link SummarizeGitLabMergeRequestDiffOptions.diffShaping}. */
  diffShaping?: DiffShapingOptions;
  /** See {@link SummarizeGitLabMergeRequestDiffOptions.excludeDefaultNoise}. */
  excludeDefaultNoise?: boolean;
  /** See {@link SummarizeGitLabMergeRequestDiffOptions.includeFolders}. */
  includeFolders?: string[];
  /** See {@link SummarizeGitLabMergeRequestDiffOptions.excludeFolders}. */
  excludeFolders?: string[];
};

/** Like {@link summarizeMergeRequestDiffWithSmartDiff}, but for `/repository/compare`. */
export async function summarizeCompareDiffWithSmartDiff(
  options: SummarizeCompareDiffOptions,
): Promise<string> {
  const cmp = await compareRefs(options.client, options.projectId, options.from, options.to);
  const filter = buildPathFilter(options);
  const diffs = filterDiffFiles(cmp.diffs ?? [], filter);
  const { diffText: rawDiff, fileNames } = buildUnifiedDiffFromMrChanges(diffs);
  const commitInfos: CommitInfo[] = (cmp.commits ?? []).map((c) => ({
    hash: c.id,
    message: c.message ?? c.title ?? "",
  }));

  const shaped = shapeUnifiedDiff(rawDiff, options.diffShaping);
  const max = resolveLlmMaxDiffChars(options.maxDiffChars);
  const diffText = truncateUnifiedDiffForLlm(shaped, max);

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
