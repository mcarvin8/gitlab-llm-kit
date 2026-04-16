# @mcarvin/gitlab-llm-kit

[![NPM](https://img.shields.io/npm/v/@mcarvin/gitlab-llm-kit.svg)](https://www.npmjs.com/package/@mcarvin/gitlab-llm-kit)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://raw.githubusercontent.com/mcarvin8/gitlab-llm-kit/main/LICENSE.md)
[![Downloads/week](https://img.shields.io/npm/dw/@mcarvin/gitlab-llm-kit.svg)](https://npmjs.org/package/@mcarvin/gitlab-llm-kit)
[![codecov](https://codecov.io/gh/mcarvin8/gitlab-llm-kit/graph/badge.svg?token=9GMSXV4DPQ)](https://codecov.io/gh/mcarvin8/gitlab-llm-kit)

TypeScript library for **AI-assisted workflows on top of the GitLab REST API**. It fetches merge requests, issues, diffs, wikis, releases, and other resources using ordinary **personal or project access tokens**, then generates summaries and review aids through an **OpenAI-compatible Chat Completions API**—including the **same LLM stack** used by [`@mcarvin/smart-diff`](https://www.npmjs.com/package/@mcarvin/smart-diff) for **git diff** summarization (local repos) and for **GitLab merge request** patches when you use the bundled helpers.

**Examples handbook:** runnable snippets for every public export are in **[HANDBOOK.md](HANDBOOK.md)**.

## Why this exists (and not GitLab Duo)

**GitLab Duo** is GitLab’s hosted AI product; it requires the appropriate GitLab subscription and Duo licensing.

**This package does not use Duo and does not call GitLab’s AI APIs.** It only uses:

- The **standard GitLab REST API** (`/api/v4/…`) that ships with GitLab CE/EE and self-managed instances.
- **Your own** OpenAI-compatible endpoint—often already provided by your company (private gateway, Azure OpenAI-compatible proxy, etc.).

So teams on **self-managed GitLab** without Duo can still get MR/issue summaries, reviewer briefings, and diff narratives **as long as they can reach GitLab’s API with a token and can reach their company’s LLM.** You pay for whatever your org already pays for models and hosting, not for Duo.

| | GitLab Duo | `@mcarvin/gitlab-llm-kit` |
|---|------------|---------------------------|
| GitLab side | Duo features inside GitLab UI | Standard REST API + tokens only |
| AI side | GitLab-managed | **Bring your own** OpenAI-compatible API |
| Self-managed GitLab | Duo availability depends on license | Works with any GitLab that exposes `/api/v4` |

---

## Requirements

- **Node.js** 20+
- Network access to **your GitLab** (`https://your.gitlab.example.com/api/v4` or GitLab.com)
- Network access to **your OpenAI-compatible** service (`OPENAI_BASE_URL` / company gateway)
- A **GitLab token** with scopes appropriate to what you call (e.g. `read_api`, `read_repository` for MR diffs—follow your admin’s least-privilege guidance)

---

## Installation

```bash
npm install @mcarvin/gitlab-llm-kit
```

---

## Configuration

### GitLab (no Duo)

Create a **Personal**, **Project**, or **Group** access token in GitLab with the scopes you need. The library sends it as `PRIVATE-TOKEN` by default (or `Authorization: Bearer` if you use `oauth: true` for OAuth tokens).

| Variable / option | Purpose |
|-------------------|---------|
| `token` (constructor) | GitLab token string |
| `baseUrl` | API root including `/api/v4`, e.g. `https://gitlab.company.com/api/v4` (default when omitted: `https://gitlab.com/api/v4`) |
| `GITLAB_BASE_URL` | Convenience only—you still pass `baseUrl` in code unless you read this in your script |

Self-managed example:

```powershell
$env:GITLAB_TOKEN = "glpat-xxxxxxxx"
$env:GITLAB_BASE_URL = "https://gitlab.internal.example.com/api/v4"
```

### OpenAI / company LLM gateway

Insight functions use **`createLabflowLlm()`**, which reads the official OpenAI client env vars. The **`@mcarvin/smart-diff`** integration (`summarizeMergeRequestDiffWithSmartDiff`, `summarizeGitDiff`, etc.) understands the same **`LLM_*`** variables as that package, so you can align with a corporate gateway.

| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | API key for the default `createLabflowLlm()` path |
| `OPENAI_BASE_URL` | Base URL for an OpenAI-compatible API (many gateways use this) |
| `OPENAI_MODEL` | Default model id for `createLabflowLlm` (optional; library default applies if unset) |
| `LLM_API_KEY` / `LLM_BASE_URL` | Used by `@mcarvin/smart-diff`’s client (`LLM_*` overrides where both exist in that package) |
| `OPENAI_DEFAULT_HEADERS` / `LLM_DEFAULT_HEADERS` | JSON object of extra headers for gateways that need RBAC or custom auth—see `@mcarvin/smart-diff` docs |
| `LLM_MAX_DIFF_CHARS` | Caps unified diff size sent to the model for diff summarization |

Example aligned with a company gateway:

```powershell
$env:OPENAI_BASE_URL = "https://llm-gateway.company.com/v1"
$env:OPENAI_API_KEY = "your-key-or-token-accepted-by-gateway"
# If your gateway requires extra headers, also set LLM_DEFAULT_HEADERS as in @mcarvin/smart-diff README.
```

---

## Quick start

Review a merge request (diff summary via smart-diff + GitLab MR changes):

```js
import { GitlabClient, summarizeMergeRequestDiffWithSmartDiff } from '@mcarvin/gitlab-llm-kit';

const client = new GitlabClient({
  token: process.env.GITLAB_TOKEN,
  baseUrl: process.env.GITLAB_BASE_URL ?? 'https://gitlab.com/api/v4',
});

const markdown = await summarizeMergeRequestDiffWithSmartDiff({
  client,
  projectId: 'namespace/project', // or numeric project id
  mergeRequestIid: 42,            // IID from the MR URL
  teamName: 'Platform',
});

console.log(markdown);
```

Discussion-focused summary (threads + title/description):

```js
import { GitlabClient, createLabflowLlm, aiMergeRequestDiscussionDigest } from '@mcarvin/gitlab-llm-kit';

const client = new GitlabClient({ token: process.env.GITLAB_TOKEN, baseUrl: '...' });
const llm = createLabflowLlm();

const digest = await aiMergeRequestDiscussionDigest(client, llm, 'namespace/project', 42);
console.log(digest);
```

Local repo (no GitLab)—re-exported from **`@mcarvin/smart-diff`**:

```js
import { summarizeGitDiff } from '@mcarvin/gitlab-llm-kit';

await summarizeGitDiff({ from: 'origin/main', to: 'HEAD', cwd: '/path/to/repo' });
```

---

## What’s included

### GitLab REST helpers (`GitlabClient`)

Low-level `request` / `requestAllPages` plus typed wrappers, for example:

| Area | Exports (representative) |
|------|---------------------------|
| Merge requests | `getMergeRequest`, `listMergeRequestNotes`, `getMergeRequestChanges`, `listMergeRequestCommits`, `listMergeRequestDiscussions` |
| Issues | `getIssue`, `listIssueNotes`, `listProjectIssues` |
| Epics | `getEpic`, `listEpicIssues`, `listGroupEpics` |
| Repository | `listCommits`, `listCommitComments`, `getFile`, `compareRefs` |
| Releases | `getReleaseByTag`, `listReleases` |
| Security | `listVulnerabilityFindings` |
| Wiki & snippets | `listWikiPages`, `getWikiPage`, `listProjectSnippets`, `getSnippet` |
| Search | `searchGitlab`, `searchInProject`, `searchInGroup` |
| Deployments | `listDeployments`, `listEnvironments` |
| Activity | `listProjectEvents`, `listGroupEvents` |
| Audit | `listProjectAuditEvents` |
| Project | `getProject`, `getReadmeFile` |

Utilities: `encodeProjectId`, `encodeGroupId`, `encodeQuery`, `GitlabHttpError`, shared **types** (`MergeRequest`, `Issue`, …).

### LLM layer

| Export | Purpose |
|--------|---------|
| `createLabflowLlm` | Build a `LabflowLlm` using the OpenAI SDK (`OPENAI_*` env). |
| `truncateForPrompt` | Trim long text for prompts. |
| `POLICY_*` | Optional strings for system prompts (secrets, security, human review). |

### Smart diff bridge (GitLab → `@mcarvin/smart-diff`)

| Export | Purpose |
|--------|---------|
| `summarizeMergeRequestDiffWithSmartDiff` | MR `/changes` patches → `generateSummary`. |
| `summarizeCompareDiffWithSmartDiff` | `/repository/compare` → `generateSummary`. |

### Insight functions (`ai…` + helpers)

These take `GitlabClient`, a `LabflowLlm` from `createLabflowLlm()`, and resource ids (project **IID** for MRs/issues where applicable).

| Area | Function | Purpose |
|------|----------|---------|
| **Merge requests** | `aiMergeRequestDiscussionDigest` | Thread + title/description digest. |
| | `aiWhatChangedSinceLastReview` | Notes since a timestamp checkpoint. |
| | `aiSuggestedMergeRequestReply` | Draft reply text. |
| | `aiMergeRequestActionItems` | Extract action items. |
| | `aiMergeRequestReviewerBriefingMeta` | Reviewer briefing from metadata (no diff). |
| **Issues** | `aiIssueThreadSummary` | Long thread summary. |
| | `aiStaleIssueSummary` | Staleness / closure hints. |
| | `aiIssueSuggestedNextStep` | Next step + closure criteria. |
| | `listOpenIssuesForProject` | List open (or closed) issues. |
| **Epics** | `aiEpicRoadmapRollup` | Roadmap-style rollup from child issues. |
| **Repository** | `aiCommitsReleaseNoteBullets` | Release-note style bullets from commits. |
| | `aiCommitCommentsDigest` | Summarize commit discussion comments. |
| | `aiExplainRepositoryPath` | Explain a file path (size limits; scrub secrets). |
| | `aiCompareRefsNarrative` | Narrative between two refs (no full diff in prompt). |
| | `aiConventionalCommitNudge` | Conventional Commits suggestions from sample messages. |
| **Releases** | `aiDraftReleaseNotes` | Draft notes from tag / commits. |
| | `aiListReleasesOverview` | Cadence / naming summary from release list. |
| **Security & compliance** | `aiVulnerabilityFindingsBrief` | Triage-oriented finding summary. |
| | `aiAuditEventsDashboardSummary` | Audit stream summary for dashboards. |
| **Wiki & snippets** | `aiWikiRunbookTldr` | TL;DR a wiki page (runbook-style). |
| | `aiWikiOutdatedDocHints` | Stale / overlap hints from wiki index + samples. |
| | `aiSnippetTldr` | Summarize a snippet. |
| | `aiSuggestMergeWikiPages` | Suggest wiki merges / consolidation. |
| **Search** | `aiSearchMentionBundle` | Summarize global/project search hits (“everything mentioning X”). |
| **Deployments** | `aiPostDeployIncidentBrief` | Post-deploy / incident brief from deployments + environments. |
| **Activity** | `aiProjectWeeklyDigest` | Weekly digest from project events. |
| | `aiGroupWeeklyDigest` | Weekly digest from group events. |
| **Project docs** | `aiProjectReadmeConsistency` | README vs project metadata consistency / onboarding gaps. |

### Re-exports from `@mcarvin/smart-diff`

For local git and advanced pipelines: `summarizeGitDiff`, `generateSummary`, `getDiff`, `getDiffSummary`, `getCommits`, `createGitClient`, `getRepoRoot`, `truncateUnifiedDiffForLlm`, `resolveLlmMaxDiffChars`, `DEFAULT_GIT_DIFF_SYSTEM_PROMPT`, `createOpenAiLikeClient`, `resolveOpenAiLikeClientInit`, `shouldUseLlmGateway`, plus related **types**.

The authoritative list of exports is **`src/index.ts`**.

---

## Security notes

- Treat tokens and model endpoints like production secrets.
- Do not paste real credentials into issues or logs.
- Review large file / wiki content before sending to an LLM; the library includes prompt guardrails, but **you** remain responsible for data classification and retention policies at your company.

---

## License

MIT — see [LICENSE.md](LICENSE.md).
