import type { LabflowLlm } from "../ai/types.js";
import { POLICY_DEFAULT } from "../ai/policies.js";
import { truncateForPrompt } from "../ai/textLimits.js";
import type { GitlabClient } from "../gitlab/client.js";
import {
  getMergeRequest,
  listMergeRequestDiscussions,
  listMergeRequestNotes,
} from "../gitlab/mergeRequests.js";
import type { MergeRequest, Note } from "../gitlab/types.js";

function formatNote(n: Note): string {
  const who = n.author?.username ?? n.author?.name ?? "?";
  const when = n.created_at ?? "";
  return `[${when}] @${who}: ${n.body ?? ""}`;
}

function formatMrHeader(mr: MergeRequest): string {
  const labels = Array.isArray(mr.labels)
    ? mr.labels.map((l) => (typeof l === "string" ? l : l.name))
    : [];
  const assignees = (mr.assignees ?? []).map((a) => a.username ?? a.name).join(", ");
  return [
    `Title: ${mr.title}`,
    mr.description ? `Description:\n${mr.description}` : "",
    `State: ${mr.state}; branches: ${mr.source_branch ?? "?"} → ${mr.target_branch ?? "?"}`,
    labels.length ? `Labels: ${labels.join(", ")}` : "",
    assignees ? `Assignees: ${assignees}` : "",
    mr.web_url ? `URL: ${mr.web_url}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Compact digest of MR discussion (title, description, all notes / discussion threads). */
export async function aiMergeRequestDiscussionDigest(
  client: GitlabClient,
  llm: LabflowLlm,
  projectId: string | number,
  mergeRequestIid: number,
  options?: { model?: string; maxPromptChars?: number },
): Promise<string> {
  const mr = await getMergeRequest(client, projectId, mergeRequestIid);
  const [notes, discussions] = await Promise.all([
    listMergeRequestNotes(client, projectId, mergeRequestIid),
    listMergeRequestDiscussions(client, projectId, mergeRequestIid),
  ]);

  const notesBlock = notes.map(formatNote).join("\n\n");
  const discBlock = discussions
    .map((d, i) => {
      const thread = (d.notes ?? []).map(formatNote).join("\n");
      return `Thread ${i + 1} (${d.id}):\n${thread}`;
    })
    .join("\n\n---\n\n");

  const raw = `${formatMrHeader(mr)}\n\n## Notes\n${notesBlock}\n\n## Discussions\n${discBlock}`;
  const user = truncateForPrompt(raw, options?.maxPromptChars ?? 100_000);

  return llm({
    model: options?.model,
    system: `${POLICY_DEFAULT}\nSummarize merge request discussion for a busy reviewer: themes, decisions, open questions. Markdown.`,
    user,
  });
}

export type ReviewSinceOptions = {
  /** Only include notes/discussion replies strictly after this ISO timestamp (exclusive). */
  sinceIso?: string;
};

/** Highlights what changed in discussion since a prior review checkpoint. */
export async function aiWhatChangedSinceLastReview(
  client: GitlabClient,
  llm: LabflowLlm,
  projectId: string | number,
  mergeRequestIid: number,
  since: ReviewSinceOptions,
  options?: { model?: string; maxPromptChars?: number },
): Promise<string> {
  const mr = await getMergeRequest(client, projectId, mergeRequestIid);
  const notes = await listMergeRequestNotes(client, projectId, mergeRequestIid);
  const cut = since.sinceIso ? Date.parse(since.sinceIso) : NaN;
  const filtered =
    Number.isFinite(cut) && !Number.isNaN(cut)
      ? notes.filter((n) => {
          if (!n.created_at) {
            return true;
          }
          return Date.parse(n.created_at) > cut;
        })
      : notes;

  const user = truncateForPrompt(
    `${formatMrHeader(mr)}\n\n## New notes since checkpoint\n${filtered.map(formatNote).join("\n\n")}`,
    options?.maxPromptChars ?? 80_000,
  );

  return llm({
    model: options?.model,
    system: `${POLICY_DEFAULT}\nList only new information since the reviewer last looked: new commits mentioned, replies, resolutions. Bulleted Markdown.`,
    user,
  });
}

/** Draft reply text the author/reviewer could post (non-authoritative). */
export async function aiSuggestedMergeRequestReply(
  client: GitlabClient,
  llm: LabflowLlm,
  projectId: string | number,
  mergeRequestIid: number,
  context: {
    /** What the reply should address (e.g. last thread excerpt). */
    inReplyTo?: string;
    tone?: "neutral" | "friendly" | "concise";
  },
  options?: { model?: string; maxPromptChars?: number },
): Promise<string> {
  const mr = await getMergeRequest(client, projectId, mergeRequestIid);
  const notes = await listMergeRequestNotes(client, projectId, mergeRequestIid);
  const tail = notes.slice(-15);
  const user = truncateForPrompt(
    `${formatMrHeader(mr)}\n\nRecent notes:\n${tail.map(formatNote).join("\n\n")}\n\nReply target:\n${context.inReplyTo ?? "(not specified)"}`,
    options?.maxPromptChars ?? 80_000,
  );

  return llm({
    model: options?.model,
    system: `${POLICY_DEFAULT}\nDraft a short GitLab comment (${context.tone ?? "neutral"}). Do not claim approvals or CI passed unless stated in the thread. Markdown, code blocks only when needed.`,
    user,
  });
}

/** Bullet list of action items extracted from MR + discussion. */
export async function aiMergeRequestActionItems(
  client: GitlabClient,
  llm: LabflowLlm,
  projectId: string | number,
  mergeRequestIid: number,
  options?: { model?: string; maxPromptChars?: number },
): Promise<string> {
  const mr = await getMergeRequest(client, projectId, mergeRequestIid);
  const [notes, discussions] = await Promise.all([
    listMergeRequestNotes(client, projectId, mergeRequestIid),
    listMergeRequestDiscussions(client, projectId, mergeRequestIid),
  ]);

  const discText = discussions
    .flatMap((d) => d.notes ?? [])
    .map(formatNote)
    .join("\n");

  const raw = `${formatMrHeader(mr)}\n\n${notes.map(formatNote).join("\n\n")}\n\n${discText}`;
  const user = truncateForPrompt(raw, options?.maxPromptChars ?? 100_000);

  return llm({
    model: options?.model,
    system: `${POLICY_DEFAULT}\nExtract concrete action items (owner if known, else TBD). Checklist Markdown.`,
    user,
  });
}

/**
 * Narrative reviewer briefing using MR metadata (labels, assignees, branches) without diff text.
 * Pair with {@link summarizeMergeRequestDiffWithSmartDiff} for risk + change summary.
 */
export async function aiMergeRequestReviewerBriefingMeta(
  client: GitlabClient,
  llm: LabflowLlm,
  projectId: string | number,
  mergeRequestIid: number,
  options?: { model?: string; maxPromptChars?: number },
): Promise<string> {
  const mr = await getMergeRequest(client, projectId, mergeRequestIid);
  const user = truncateForPrompt(`${formatMrHeader(mr)}`, options?.maxPromptChars ?? 16_000);

  return llm({
    model: options?.model,
    system: `${POLICY_DEFAULT}\nWrite a short reviewer briefing: context, blast radius guess from title/branches/labels, questions to ask. Markdown. No diff content provided.`,
    user,
  });
}
