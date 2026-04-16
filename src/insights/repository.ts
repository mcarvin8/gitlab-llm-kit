import type { LabflowLlm } from "../ai/types.js";
import { POLICY_DEFAULT, POLICY_NO_SECRET_EXFILTRATION } from "../ai/policies.js";
import { truncateForPrompt } from "../ai/textLimits.js";
import type { GitlabClient } from "../gitlab/client.js";
import {
  compareRefs,
  getFile,
  listCommitComments,
  listCommits,
} from "../gitlab/repository.js";

function formatCommitLine(c: {
  id: string;
  title?: string;
  message?: string;
  authored_date?: string;
}): string {
  const msg = c.title ?? (c.message ?? "").split("\n")[0] ?? "";
  return `- ${c.id.slice(0, 8)} ${c.authored_date ?? ""} — ${msg}`;
}

/** Release-note style bullets from commits on a ref. */
export async function aiCommitsReleaseNoteBullets(
  client: GitlabClient,
  llm: LabflowLlm,
  projectId: string | number,
  ref: string,
  options?: { model?: string; maxPromptChars?: number; path?: string },
): Promise<string> {
  const commits = await listCommits(client, projectId, {
    ref_name: ref,
    path: options?.path,
  });

  const lines = commits.map(formatCommitLine).join("\n");
  const user = truncateForPrompt(
    `Ref: ${ref}\n\nCommits:\n${lines}`,
    options?.maxPromptChars ?? 100_000,
  );

  return llm({
    model: options?.model,
    system: `${POLICY_DEFAULT}\nWrite concise release-note bullets for end users (not every commit). Group related items. Markdown.`,
    user,
  });
}

/** Summarize discussion anchored on a commit SHA. */
export async function aiCommitCommentsDigest(
  client: GitlabClient,
  llm: LabflowLlm,
  projectId: string | number,
  sha: string,
  options?: { model?: string; maxPromptChars?: number },
): Promise<string> {
  const notes = await listCommitComments(client, projectId, sha);
  const formatted = notes
    .map((n) => `[${n.created_at ?? ""}] ${n.author?.username ?? "?"}: ${n.body}`)
    .join("\n\n");

  const user = truncateForPrompt(formatted, options?.maxPromptChars ?? 40_000);

  return llm({
    model: options?.model,
    system: `${POLICY_DEFAULT}\nSummarize commit discussion / review notes briefly. Markdown.`,
    user,
  });
}

export type ExplainPathOptions = {
  /** Skip calling the LLM if base64-decoded size estimate exceeds this (bytes). */
  maxDecodedBytes?: number;
};

/**
 * Explain what a path does (redacted for size). **Do not** send likely-secret files without review.
 */
export async function aiExplainRepositoryPath(
  client: GitlabClient,
  llm: LabflowLlm,
  projectId: string | number,
  filePath: string,
  ref: string,
  options?: ExplainPathOptions & { model?: string; maxPromptChars?: number },
): Promise<string> {
  const blob = await getFile(client, projectId, filePath, ref);
  const maxBytes = options?.maxDecodedBytes ?? 80_000;
  let payload = `(file ${blob.file_path}, size ${blob.size} bytes, encoding ${blob.encoding ?? "text"})\n`;

  if (blob.encoding === "base64" && typeof blob.content === "string") {
    const buf = Buffer.from(blob.content, "base64");
    if (buf.length > maxBytes) {
      payload += `[Skipped body: ${buf.length} bytes > maxDecodedBytes ${maxBytes}]`;
    } else {
      payload += buf.toString("utf8");
    }
  } else {
    payload += blob.content ?? "";
  }

  const user = truncateForPrompt(payload, options?.maxPromptChars ?? 60_000);

  return llm({
    model: options?.model,
    system: `${POLICY_DEFAULT}\n${POLICY_NO_SECRET_EXFILTRATION}\nDescribe what this path is responsible for and notable dependencies. If content looks truncated, say so. Markdown.`,
    user,
  });
}

/** Compare refs as a narrative (diff text optionally summarized separately via {@link summarizeCompareDiffWithSmartDiff}). */
export async function aiCompareRefsNarrative(
  client: GitlabClient,
  llm: LabflowLlm,
  projectId: string | number,
  from: string,
  to: string,
  options?: { model?: string; maxPromptChars?: number },
): Promise<string> {
  const cmp = await compareRefs(client, projectId, from, to);
  const commits = (cmp.commits ?? []).map(formatCommitLine).join("\n");
  const paths = (cmp.diffs ?? [])
    .map((d) => `${d.new_path ?? d.old_path ?? "?"} (${d.new_file ? "add" : d.deleted_file ? "del" : "mod"})`)
    .join("\n");
  const user = truncateForPrompt(
    `Compare ${from}..${to}\n\n## Commits\n${commits}\n\n## Paths\n${paths}`,
    options?.maxPromptChars ?? 80_000,
  );

  return llm({
    model: options?.model,
    system: `${POLICY_DEFAULT}\nHigh-level narrative of what changed between refs (no line-by-line diff included). Markdown.`,
    user,
  });
}

/** Nudge toward Conventional Commits style (advisory). */
export async function aiConventionalCommitNudge(
  llm: LabflowLlm,
  sampleCommitMessages: string[],
  options?: { model?: string },
): Promise<string> {
  const user = sampleCommitMessages.join("\n\n---\n\n");
  return llm({
    model: options?.model,
    system: `${POLICY_DEFAULT}\nReview these commit messages and suggest Conventional Commits improvements (type(scope): subject). Short Markdown.`,
    user,
  });
}
