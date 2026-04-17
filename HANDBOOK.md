# Handbook

This document complements the [README](README.md) with **copy-paste-oriented examples** for public exports. By default, insight functions only **read** from GitLab and return text in memory. **Optional** paths post to GitLab: `createMergeRequestNote` / `createIssueNote`, `upsertRelease`, `upsertWikiPage`, and matching insight flags—those require a token with the **`api`** scope (see [GitLab REST — merge requests](#gitlab-rest--merge-requests), [issues](#gitlab-rest--issues), [releases](#gitlab-rest--releases), and [wiki](#gitlab-rest--wiki--snippets)).

**Convention:** replace placeholders (`YOUR_PROJECT`, `42`, …). Use **`merge_request_iid` / `issue_iid`** from the GitLab URL, not the global database id.

**Import (published package):**

```ts
import { GitlabClient, createLabflowLlm } from "@mcarvin/gitlab-llm-kit";
```

**Import (local build):**

```ts
import { GitlabClient, createLabflowLlm } from "./dist/index.mjs";
```

---

## Table of contents

1. [Environment](#environment)
2. [Shared client and LLM](#shared-client-and-llm)
3. [Utilities](#utilities)
4. [GitLab REST — merge requests](#gitlab-rest--merge-requests)
5. [GitLab REST — issues](#gitlab-rest--issues)
6. [GitLab REST — epics](#gitlab-rest--epics)
7. [GitLab REST — repository](#gitlab-rest--repository)
8. [GitLab REST — releases](#gitlab-rest--releases)
9. [GitLab REST — security](#gitlab-rest--security)
10. [GitLab REST — wiki & snippets](#gitlab-rest--wiki--snippets)
11. [GitLab REST — search](#gitlab-rest--search)
12. [GitLab REST — deployments & environments](#gitlab-rest--deployments--environments)
13. [GitLab REST — events](#gitlab-rest--events)
14. [GitLab REST — audit](#gitlab-rest--audit)
15. [GitLab REST — project](#gitlab-rest--project)
16. [LLM helpers (`createLabflowLlm`, policies, truncate)](#llm-helpers-createlabflowllm-policies-truncate)
17. [Smart diff bridge (GitLab → `@mcarvin/smart-diff`)](#smart-diff-bridge-gitlab--mcarvinsmart-diff)
18. [Insight functions — merge requests](#insight-functions--merge-requests)
19. [Insight functions — issues](#insight-functions--issues)
20. [Insight functions — epics](#insight-functions--epics)
21. [Insight functions — repository](#insight-functions--repository)
22. [Insight functions — releases](#insight-functions--releases)
23. [Insight functions — security & audit](#insight-functions--security--audit)
24. [Insight functions — wiki & snippets](#insight-functions--wiki--snippets)
25. [Insight functions — search](#insight-functions--search)
26. [Insight functions — deployments](#insight-functions--deployments)
27. [Insight functions — activity](#insight-functions--activity)
28. [Insight functions — project README / metadata](#insight-functions--project-readme--metadata)
29. [Re-exports from `@mcarvin/smart-diff` (local git)](#re-exports-from-mcarvinsmart-diff-local-git)

---

## Environment

Typical variables (see README for full tables):

```bash
export GITLAB_TOKEN="glpat-..."
export GITLAB_BASE_URL="https://gitlab.example.com/api/v4"
export OPENAI_API_KEY="..."
export OPENAI_BASE_URL="..."   # optional company gateway
export OPENAI_MODEL="gpt-4o-mini"
```

---

## Shared client and LLM

Use one `GitlabClient` and one `LabflowLlm` for all insight (`ai…`) calls:

```ts
const client = new GitlabClient({
  token: process.env.GITLAB_TOKEN!,
  baseUrl: process.env.GITLAB_BASE_URL ?? "https://gitlab.com/api/v4",
  // oauth: true,  // only if using OAuth Bearer tokens
});

const llm = createLabflowLlm({
  // apiKey: process.env.OPENAI_API_KEY,
  // baseURL: process.env.OPENAI_BASE_URL,
  // defaultModel: "gpt-4o-mini",
});

const PROJECT = "namespace/project"; // or numeric project id
```

---

## Utilities

### `encodeProjectId` / `encodeGroupId`

```ts
import { encodeProjectId, encodeGroupId } from "@mcarvin/gitlab-llm-kit";

encodeProjectId("group/sub"); // "group%2Fsub"
encodeGroupId("my-group"); // "my-group"
```

### `encodeQuery`

```ts
import { encodeQuery } from "@mcarvin/gitlab-llm-kit";

const q = encodeQuery({ state: "opened", page: 1, skip: undefined });
// "?state=opened&page=1"
```

### `GitlabHttpError`

Thrown by `GitlabClient` on non-2xx or invalid JSON; catch and read `.status` / `.body`.

---

## GitLab REST — merge requests

```ts
import {
  getMergeRequest,
  listMergeRequestNotes,
  getMergeRequestChanges,
  listMergeRequestCommits,
  listMergeRequestDiscussions,
} from "@mcarvin/gitlab-llm-kit";

const mr = await getMergeRequest(client, PROJECT, 42);
const notes = await listMergeRequestNotes(client, PROJECT, 42);
const changes = await getMergeRequestChanges(client, PROJECT, 42);
const commits = await listMergeRequestCommits(client, PROJECT, 42);
const discussions = await listMergeRequestDiscussions(client, PROJECT, 42);
```

### `createMergeRequestNote` (write)

Creates a **general** (non-inline) note on the merge request—the same kind of comment as a normal MR discussion note.

Use a GitLab **personal, project, or group access token** with the **`api`** scope. Read-only scopes (`read_api`, …) are **not** enough to create notes.

```ts
import { createMergeRequestNote } from "@mcarvin/gitlab-llm-kit";

const created = await createMergeRequestNote(client, PROJECT, 42, {
  body: "## Summary\n\nYour markdown here.",
});
void created.id;
```

Wrong scope usually surfaces as **`GitlabHttpError`** with **`status` 403** and a JSON **`body`** containing `"error":"insufficient_scope"` (see README → *Posting summaries as merge request or issue notes*).

---

## GitLab REST — issues

```ts
import { getIssue, listIssueNotes, listProjectIssues } from "@mcarvin/gitlab-llm-kit";

const issue = await getIssue(client, PROJECT, 7);
const issueNotes = await listIssueNotes(client, PROJECT, 7);
const opened = await listProjectIssues(client, PROJECT, { state: "opened" });
```

### `createIssueNote` (write)

Creates a note on the issue. Requires a token with the **`api`** scope (same privilege story as `createMergeRequestNote`).

```ts
import { createIssueNote } from "@mcarvin/gitlab-llm-kit";

const created = await createIssueNote(client, PROJECT, 7, {
  body: "## Summary\n\nYour markdown here.",
});
void created.id;
```

---

## GitLab REST — epics

Epics are **group**-scoped (`groupId` = group path or id).

```ts
import { getEpic, listEpicIssues, listGroupEpics } from "@mcarvin/gitlab-llm-kit";

const GROUP = "my-group";

const epic = await getEpic(client, GROUP, 3);
const children = await listEpicIssues(client, GROUP, 3);
const epics = await listGroupEpics(client, GROUP, { state: "opened" });
```

---

## GitLab REST — repository

```ts
import {
  listCommits,
  listCommitComments,
  getFile,
  compareRefs,
} from "@mcarvin/gitlab-llm-kit";

const commits = await listCommits(client, PROJECT, { ref_name: "main" });
const onSha = await listCommitComments(client, PROJECT, "abc123...");
const blob = await getFile(client, PROJECT, "README.md", "main");
const cmp = await compareRefs(client, PROJECT, "v1.0.0", "main");
```

---

## GitLab REST — releases

```ts
import { getReleaseByTag, listReleases, upsertRelease } from "@mcarvin/gitlab-llm-kit";

const rel = await getReleaseByTag(client, PROJECT, "v1.0.0");
const all = await listReleases(client, PROJECT);

const saved = await upsertRelease(client, PROJECT, "v1.1.0", {
  description: "## Highlights\n\n…",
  // ref: "main", // only when creating a release and the tag does not exist yet
});
void saved.tag_name;
```

---

## GitLab REST — security

```ts
import { listVulnerabilityFindings } from "@mcarvin/gitlab-llm-kit";

const findings = await listVulnerabilityFindings(client, PROJECT, {
  report_type: "sast",
});
```

---

## GitLab REST — wiki & snippets

```ts
import {
  listWikiPages,
  getWikiPage,
  createWikiPage,
  updateWikiPage,
  upsertWikiPage,
  listProjectSnippets,
  getSnippet,
} from "@mcarvin/gitlab-llm-kit";

const index = await listWikiPages(client, PROJECT);
const page = await getWikiPage(client, PROJECT, "home", "optional-version-id");

const created = await createWikiPage(client, PROJECT, {
  title: "Runbook",
  content: "# Runbook\n",
  format: "markdown",
});

await updateWikiPage(client, PROJECT, "release-overview", {
  content: "## Updated\n",
});

await upsertWikiPage(client, PROJECT, "release-cadence", {
  content: "# Cadence\n",
  title: "Release cadence",
});

const snippets = await listProjectSnippets(client, PROJECT);
const sn = await getSnippet(client, 12345);
```

---

## GitLab REST — search

```ts
import { searchGitlab, searchInProject, searchInGroup } from "@mcarvin/gitlab-llm-kit";

const hits = await searchGitlab(client, {
  scope: "issues",
  search: "regression",
  projectId: PROJECT,
});

const inProj = await searchInProject(client, PROJECT, "merge_requests", "auth");
const inGrp = await searchInGroup(client, "my-group", "commits", "fix");
```

---

## GitLab REST — deployments & environments

```ts
import { listDeployments, listEnvironments } from "@mcarvin/gitlab-llm-kit";

const deps = await listDeployments(client, PROJECT, { environment: "production" });
const envs = await listEnvironments(client, PROJECT);
```

---

## GitLab REST — events

```ts
import { listProjectEvents, listGroupEvents } from "@mcarvin/gitlab-llm-kit";

const projEv = await listProjectEvents(client, PROJECT, { per_page: 50 });
const grpEv = await listGroupEvents(client, "my-group", {});
```

---

## GitLab REST — audit

```ts
import { listProjectAuditEvents } from "@mcarvin/gitlab-llm-kit";

const audits = await listProjectAuditEvents(client, PROJECT, {});
```

---

## GitLab REST — project

```ts
import { getProject, getReadmeFile } from "@mcarvin/gitlab-llm-kit";

const meta = await getProject(client, PROJECT);
const readme = await getReadmeFile(client, PROJECT, "README.md", meta.default_branch ?? "main");
```

---

## LLM helpers (`createLabflowLlm`, policies, truncate)

```ts
import {
  createLabflowLlm,
  POLICY_DEFAULT,
  POLICY_NO_SECRET_EXFILTRATION,
  POLICY_SECURITY_FINDINGS,
  POLICY_HUMAN_REVIEW,
  truncateForPrompt,
} from "@mcarvin/gitlab-llm-kit";

const llm = createLabflowLlm();
const short = truncateForPrompt(longText, 50_000);
void POLICY_DEFAULT;
void POLICY_NO_SECRET_EXFILTRATION;
void POLICY_SECURITY_FINDINGS;
void POLICY_HUMAN_REVIEW;

// Custom call (same shape insight functions use internally):
const out = await llm({
  system: "You are a helpful assistant.",
  user: "Summarize: ...",
  model: "gpt-4o-mini",
});
```

---

## Smart diff bridge (GitLab → `@mcarvin/smart-diff`)

Uses **`@mcarvin/smart-diff`** env (`OPENAI_API_KEY` / `LLM_*`, etc.), not only `createLabflowLlm`.

### `summarizeMergeRequestDiffWithSmartDiff`

After the summary is generated, you can **post it as a merge request note** with `postSummaryAsMergeRequestNote: true`. That issues `POST …/merge_requests/:iid/notes` and requires a token with the **`api`** scope (same as `createMergeRequestNote`).

```ts
import { summarizeMergeRequestDiffWithSmartDiff } from "@mcarvin/gitlab-llm-kit";

const markdown = await summarizeMergeRequestDiffWithSmartDiff({
  client,
  projectId: PROJECT,
  mergeRequestIid: 42,
  teamName: "Platform",
  // postSummaryAsMergeRequestNote: true,  // optional; needs PAT with `api` scope
  // model: "gpt-4o",
  // maxDiffChars: 80_000,
  // openAiClientProvider: async () => createOpenAiLikeClient(),
});
console.log(markdown);
```

### `summarizeCompareDiffWithSmartDiff`

```ts
import { summarizeCompareDiffWithSmartDiff } from "@mcarvin/gitlab-llm-kit";

const markdown = await summarizeCompareDiffWithSmartDiff({
  client,
  projectId: PROJECT,
  from: "v1.0.0",
  to: "main",
  teamName: "Platform",
});
```

---

## Insight functions — merge requests

All take `(client, llm, projectId, mergeRequestIid, …)` unless noted. These insight functions accept **`AiMergeRequestInsightOptions`** on the last argument and can **`postSummaryAsMergeRequestNote`**: `aiMergeRequestDiscussionDigest`, `aiWhatChangedSinceLastReview`, `aiSuggestedMergeRequestReply`, `aiMergeRequestActionItems`, `aiMergeRequestReviewerBriefingMeta`.

### `aiMergeRequestDiscussionDigest`

Options use `AiMergeRequestInsightOptions` (`model`, `maxPromptChars`, `postSummaryAsMergeRequestNote`). Set `postSummaryAsMergeRequestNote: true` to post the digest as an MR note after generation; requires a PAT with the **`api`** scope.

```ts
import { aiMergeRequestDiscussionDigest } from "@mcarvin/gitlab-llm-kit";

const text = await aiMergeRequestDiscussionDigest(client, llm, PROJECT, 42, {
  model: "gpt-4o-mini",
  maxPromptChars: 100_000,
  // postSummaryAsMergeRequestNote: true,
});
```

### `aiWhatChangedSinceLastReview`

Checkpoint is `since.sinceIso`; optional `postSummaryAsMergeRequestNote` on the options object (PAT with **`api`** scope).

```ts
import { aiWhatChangedSinceLastReview } from "@mcarvin/gitlab-llm-kit";

const text = await aiWhatChangedSinceLastReview(
  client,
  llm,
  PROJECT,
  42,
  { sinceIso: "2025-01-01T12:00:00Z" },
  {
    // postSummaryAsMergeRequestNote: true,
  },
);
```

### `aiSuggestedMergeRequestReply`

Optional `postSummaryAsMergeRequestNote` posts the draft as a **general** MR note (same API as other helpers), not as a reply inside a specific discussion thread.

```ts
import { aiSuggestedMergeRequestReply } from "@mcarvin/gitlab-llm-kit";

const text = await aiSuggestedMergeRequestReply(
  client,
  llm,
  PROJECT,
  42,
  {
    inReplyTo: "Can you add tests for the edge case?",
    tone: "concise",
  },
  {
    // postSummaryAsMergeRequestNote: true,
  },
);
```

### `aiMergeRequestActionItems`

Same optional `postSummaryAsMergeRequestNote` as `aiMergeRequestDiscussionDigest` (PAT with **`api`** scope to post).

```ts
import { aiMergeRequestActionItems } from "@mcarvin/gitlab-llm-kit";

const text = await aiMergeRequestActionItems(client, llm, PROJECT, 42, {
  // postSummaryAsMergeRequestNote: true,
});
```

### `aiMergeRequestReviewerBriefingMeta`

Metadata-only briefing (no diff in prompt). Optional `postSummaryAsMergeRequestNote` (PAT with **`api`** scope).

```ts
import { aiMergeRequestReviewerBriefingMeta } from "@mcarvin/gitlab-llm-kit";

const text = await aiMergeRequestReviewerBriefingMeta(client, llm, PROJECT, 42, {
  // postSummaryAsMergeRequestNote: true,
});
```

---

## Insight functions — issues

### `aiIssueThreadSummary` / `aiStaleIssueSummary` / `aiIssueSuggestedNextStep`

Options use **`AiIssueInsightOptions`** (`model`, `maxPromptChars`, `postSummaryAsIssueNote`). Set `postSummaryAsIssueNote: true` to post the generated markdown as an issue note; requires a PAT with the **`api`** scope.

```ts
import {
  aiIssueThreadSummary,
  aiStaleIssueSummary,
  aiIssueSuggestedNextStep,
} from "@mcarvin/gitlab-llm-kit";

const a = await aiIssueThreadSummary(client, llm, PROJECT, 7, {
  // postSummaryAsIssueNote: true,
});
const b = await aiStaleIssueSummary(client, llm, PROJECT, 7);
const c = await aiIssueSuggestedNextStep(client, llm, PROJECT, 7);
```

### `listOpenIssuesForProject`

REST helper (no LLM).

```ts
import { listOpenIssuesForProject } from "@mcarvin/gitlab-llm-kit";

const open = await listOpenIssuesForProject(client, PROJECT, "opened");
```

---

## Insight functions — epics

```ts
import { aiEpicRoadmapRollup } from "@mcarvin/gitlab-llm-kit";

const text = await aiEpicRoadmapRollup(client, llm, "my-group", 1);
```

---

## Insight functions — repository

```ts
import {
  aiCommitsReleaseNoteBullets,
  aiCommitCommentsDigest,
  aiExplainRepositoryPath,
  aiCompareRefsNarrative,
  aiConventionalCommitNudge,
} from "@mcarvin/gitlab-llm-kit";

const bullets = await aiCommitsReleaseNoteBullets(client, llm, PROJECT, "main", {
  path: "src",
});

const commitTalk = await aiCommitCommentsDigest(client, llm, PROJECT, "abc123...");

const explain = await aiExplainRepositoryPath(client, llm, PROJECT, "src/app.ts", "main", {
  maxDecodedBytes: 80_000,
  maxPromptChars: 60_000,
});

const narrative = await aiCompareRefsNarrative(client, llm, PROJECT, "v1.0.0", "main");

const nudge = await aiConventionalCommitNudge(
  llm,
  ["wip fix stuff", "feat: add auth"],
  { model: "gpt-4o-mini" },
);
```

---

## Insight functions — releases

`aiDraftReleaseNotes` options include **`AiDraftReleaseNotesOptions`**: `priorTag`, `postSummaryAsReleaseDescription`, `releaseRef` (if GitLab must create the tag when creating the release), and `releaseName`. Posting the description requires a PAT with the **`api`** scope.

`aiListReleasesOverview` accepts **`AiListReleasesOverviewOptions`**: optional **`postSummaryToWikiSlug`** (e.g. `release-cadence-overview`), plus **`wikiPageTitle`** and **`wikiFormat`** for `upsertWikiPage`.

```ts
import { aiDraftReleaseNotes, aiListReleasesOverview } from "@mcarvin/gitlab-llm-kit";

const draft = await aiDraftReleaseNotes(client, llm, PROJECT, "v1.1.0", {
  priorTag: "v1.0.0",
  // postSummaryAsReleaseDescription: true,
  // releaseRef: "main",
});

const overview = await aiListReleasesOverview(client, llm, PROJECT, {
  // postSummaryToWikiSlug: "release-cadence-overview",
  // wikiPageTitle: "Release cadence",
});
```

---

## Insight functions — security & audit

```ts
import {
  aiVulnerabilityFindingsBrief,
  aiAuditEventsDashboardSummary,
} from "@mcarvin/gitlab-llm-kit";

const sec = await aiVulnerabilityFindingsBrief(client, llm, PROJECT);
const audit = await aiAuditEventsDashboardSummary(client, llm, PROJECT);
```

---

## Insight functions — wiki & snippets

`aiWikiRunbookTldr`, `aiWikiOutdatedDocHints`, and `aiSuggestMergeWikiPages` share optional **`postSummaryToWikiSlug`**, **`wikiPageTitle`**, and **`wikiFormat`** (see **`AiWikiInsightOptions`**). Posting uses **`upsertWikiPage`** and requires a PAT with the **`api`** scope. For runbook TL;DR, choose a **target** slug (e.g. `runbooks/deploy-tldr`) so you do not overwrite the full source page unless intended.

```ts
import {
  aiWikiRunbookTldr,
  aiWikiOutdatedDocHints,
  aiSnippetTldr,
  aiSuggestMergeWikiPages,
} from "@mcarvin/gitlab-llm-kit";

const tldr = await aiWikiRunbookTldr(client, llm, PROJECT, "runbooks/deploy", {
  wikiVersion: undefined,
  // postSummaryToWikiSlug: "runbooks/deploy-tldr",
  // wikiPageTitle: "Deploy runbook — TL;DR",
});

const hints = await aiWikiOutdatedDocHints(client, llm, PROJECT, {
  sampleSlugs: ["home", "runbooks/deploy"],
  // postSummaryToWikiSlug: "internal/wiki-health-report",
});

const snip = await aiSnippetTldr(client, llm, 12345);

const merge = await aiSuggestMergeWikiPages(client, llm, PROJECT, {
  // postSummaryToWikiSlug: "wiki-merge-suggestions",
});
```

---

## Insight functions — search

```ts
import { aiSearchMentionBundle } from "@mcarvin/gitlab-llm-kit";

const text = await aiSearchMentionBundle(
  client,
  llm,
  PROJECT,
  "issues",
  "timeout",
  { maxPromptChars: 120_000 },
);
```

---

## Insight functions — deployments

```ts
import { aiPostDeployIncidentBrief } from "@mcarvin/gitlab-llm-kit";

const text = await aiPostDeployIncidentBrief(client, llm, PROJECT, {
  environment: "production",
  perPage: 30,
});
```

---

## Insight functions — activity

```ts
import { aiProjectWeeklyDigest, aiGroupWeeklyDigest } from "@mcarvin/gitlab-llm-kit";

const proj = await aiProjectWeeklyDigest(client, llm, PROJECT);
const grp = await aiGroupWeeklyDigest(client, llm, "my-group");
```

---

## Insight functions — project README / metadata

```ts
import { aiProjectReadmeConsistency } from "@mcarvin/gitlab-llm-kit";

const text = await aiProjectReadmeConsistency(client, llm, PROJECT, {
  readmePath: "README.md",
  ref: "main",
});
```

---

## Re-exports from `@mcarvin/smart-diff` (local git)

These work **without** GitLab; they use a **local clone** on disk. Configure the same env as `smart-diff` (`OPENAI_API_KEY` / `LLM_*`, etc.).

### `summarizeGitDiff`

```ts
import { summarizeGitDiff } from "@mcarvin/gitlab-llm-kit";

const markdown = await summarizeGitDiff({
  from: "origin/main",
  to: "HEAD",
  cwd: "/path/to/repo",
  teamName: "Platform",
});
```

### `generateSummary` (advanced)

Build `diffText`, `fileNames`, `commits`, `flags` yourself; see `@mcarvin/smart-diff` types `GenerateSummaryInput`, `SummarizeFlags`.

### `getDiff`, `getDiffSummary`, `getCommits`, `createGitClient`, `getRepoRoot`

```ts
import {
  createGitClient,
  getCommits,
  getDiff,
  getDiffSummary,
  getRepoRoot,
} from "@mcarvin/gitlab-llm-kit";

const git = createGitClient("/path/to/repo");
const root = await getRepoRoot(git);
const commits = await getCommits(git, "main", "HEAD");
```

### `createOpenAiLikeClient`, `resolveOpenAiLikeClientInit`, `shouldUseLlmGateway`

```ts
import {
  createOpenAiLikeClient,
  resolveOpenAiLikeClientInit,
  shouldUseLlmGateway,
} from "@mcarvin/gitlab-llm-kit";

void shouldUseLlmGateway();
void resolveOpenAiLikeClientInit();
const client = await createOpenAiLikeClient();
```

### `truncateUnifiedDiffForLlm`, `resolveLlmMaxDiffChars`, `DEFAULT_GIT_DIFF_SYSTEM_PROMPT`

```ts
import {
  truncateUnifiedDiffForLlm,
  resolveLlmMaxDiffChars,
  DEFAULT_GIT_DIFF_SYSTEM_PROMPT,
} from "@mcarvin/gitlab-llm-kit";

const max = resolveLlmMaxDiffChars(80_000);
const truncated = truncateUnifiedDiffForLlm(diffText, max);
void DEFAULT_GIT_DIFF_SYSTEM_PROMPT;
```

---

## Types

Import types alongside values when you need them:

```ts
import type {
  AiDraftReleaseNotesOptions,
  AiListReleasesOverviewOptions,
  AiWikiInsightOptions,
  AiWikiRunbookTldrOptions,
  AiWikiOutdatedDocHintsOptions,
  AiIssueInsightOptions,
  AiMergeRequestInsightOptions,
  CreateWikiPageParams,
  UpdateWikiPageParams,
  UpsertWikiPageParams,
  MergeRequest,
  Issue,
  GitlabClientOptions,
  LabflowLlm,
  SummarizeGitLabMergeRequestDiffOptions,
  ReviewSinceOptions,
  UpsertReleaseParams,
  ExplainPathOptions,
  GitDiffAiSummaryOptions,
  CommitInfo,
  DiffSummary,
  GenerateSummaryInput,
  SummarizeFlags,
  OpenAiLikeClient,
  OpenAiLikeClientInit,
} from "@mcarvin/gitlab-llm-kit";
```

---

## See also

- [README.md](README.md) — product overview, Duo vs BYO LLM, configuration tables.
- [src/index.ts](src/index.ts) — authoritative export list if this file drifts.
