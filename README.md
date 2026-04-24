# @mcarvin/gitlab-llm-kit

[![NPM](https://img.shields.io/npm/v/@mcarvin/gitlab-llm-kit.svg)](https://www.npmjs.com/package/@mcarvin/gitlab-llm-kit)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://raw.githubusercontent.com/mcarvin8/gitlab-llm-kit/main/LICENSE.md)
[![Downloads/week](https://img.shields.io/npm/dw/@mcarvin/gitlab-llm-kit.svg)](https://npmjs.org/package/@mcarvin/gitlab-llm-kit)
[![codecov](https://codecov.io/gh/mcarvin8/gitlab-llm-kit/graph/badge.svg?token=9GMSXV4DPQ)](https://codecov.io/gh/mcarvin8/gitlab-llm-kit)

TypeScript library for **AI-assisted workflows on top of the GitLab REST API**. It fetches merge requests, issues, diffs, wikis, releases, and other resources using ordinary **personal or project access tokens**, then generates summaries and review aids through any LLM provider supported by the [Vercel AI SDK](https://sdk.vercel.ai) — **OpenAI, Anthropic, Google Gemini, Amazon Bedrock, Mistral, Cohere, Groq, xAI, DeepSeek, or any OpenAI-compatible gateway**.

> **Examples handbook:** runnable snippets for every public export are in **[HANDBOOK.md](https://github.com/mcarvin8/gitlab-llm-kit/blob/main/HANDBOOK.md)**.

## Why this exists (and not GitLab Duo)

**GitLab Duo** is GitLab’s hosted AI product; it requires the appropriate GitLab subscription and Duo licensing.

**This package does not use Duo and does not call GitLab’s AI APIs.** It only uses:

- The **standard GitLab REST API** (`/api/v4/…`) that ships with GitLab CE/EE and self-managed instances.
- **Your own** LLM — any provider supported by the Vercel AI SDK (OpenAI, Anthropic, Google, Bedrock, Mistral, Cohere, Groq, xAI, DeepSeek) or an OpenAI-compatible gateway (company proxy, Azure OpenAI-compatible proxy, etc.).

So teams on **self-managed GitLab** without Duo can still get MR/issue summaries, reviewer briefings, and diff narratives **as long as they can reach GitLab’s API with a token and can reach their chosen LLM.** You pay for whatever your org already pays for models and hosting, not for Duo.

| | GitLab Duo | `@mcarvin/gitlab-llm-kit` |
|---|------------|---------------------------|
| GitLab side | Duo features inside GitLab UI | Standard REST API + tokens only |
| AI side | GitLab-managed | **Bring your own** — any Vercel AI SDK provider or OpenAI-compatible endpoint |
| Self-managed GitLab | Duo availability depends on license | Works with any GitLab that exposes `/api/v4` |

---

## Requirements

- **Node.js** 20+
- Network access to **your GitLab** (`https://your.gitlab.example.com/api/v4` or GitLab.com)
- Network access to **your LLM** (OpenAI, Anthropic, Google, Bedrock, Mistral, Cohere, Groq, xAI, DeepSeek, or an OpenAI-compatible gateway)
- A **GitLab token** with scopes appropriate to what you call (e.g. `read_api`, `read_repository` for MR diffs—follow your admin’s least-privilege guidance). **Posting merge request notes** (optional on some helpers) requires a token with the **`api`** scope so GitLab accepts `POST` to the notes API.
- An **LLM provider credential** (see [LLM configuration](#openai--bring-your-own-llm-gateway)). `@ai-sdk/openai` and `@ai-sdk/openai-compatible` ship as direct dependencies via `@mcarvin/smart-diff`. Every other provider (`@ai-sdk/anthropic`, `@ai-sdk/google`, `@ai-sdk/amazon-bedrock`, `@ai-sdk/mistral`, `@ai-sdk/cohere`, `@ai-sdk/groq`, `@ai-sdk/xai`, `@ai-sdk/deepseek`) is declared as an **optional peer** and only needs to be installed when you actually use that provider.
- **`@mcarvin/smart-diff` and Git:** Helpers that summarize a **GitLab merge request** (`summarizeMergeRequestDiffWithSmartDiff`, etc.) only use the GitLab REST API plus the LLM—**no local Git install** is required. Helpers that summarize a **local clone** (`summarizeGitDiff`, `generateSummary` with patches from disk, etc.) need the **`git` CLI on your `PATH`**. On Windows, install [Git for Windows](https://git-scm.com/download/win) (or another distribution) and ensure `git` is available to the same environment as Node—often **Git Bash** or **PowerShell** after choosing “Git from the command line” during setup. CI images usually include `git`; add it explicitly if your runner image is minimal.

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

**Writing MR or issue comments, releases, or wiki:** To use `createMergeRequestNote`, `createIssueNote`, `upsertRelease`, `createWikiPage`, `updateWikiPage`, `upsertWikiPage`, or related insight flags (`postSummaryAsMergeRequestNote`, `postSummaryAsIssueNote`, `postSummaryAsReleaseDescription`, `postSummaryToWikiSlug`, …), the token must include the **`api`** scope (full REST read/write). Read-only scopes are not sufficient for those writes.

Self-managed example:

```powershell
$env:GITLAB_TOKEN = "glpat-xxxxxxxx"
$env:GITLAB_BASE_URL = "https://gitlab.internal.example.com/api/v4"
```

### LLM — bring your own (OpenAI, Anthropic, Google, Bedrock, …)

Both `createLabflowLlm()` and the `@mcarvin/smart-diff` integration share the **same provider resolver**: they look at the standard `LLM_*` / provider-specific env vars and build a [Vercel AI SDK](https://sdk.vercel.ai) `LanguageModel`. You can pick a provider explicitly with `LLM_PROVIDER` or let auto-detection choose based on which credentials are set.

#### Selecting a provider

`LLM_PROVIDER` explicitly selects a provider. When unset, the resolver auto-detects in this order: `LLM_BASE_URL`/`OPENAI_BASE_URL` → `openai-compatible`, `OPENAI_API_KEY`/`LLM_API_KEY` → `openai`, then `ANTHROPIC_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY` (or `GOOGLE_API_KEY`), `MISTRAL_API_KEY`, `COHERE_API_KEY`, `GROQ_API_KEY`, `XAI_API_KEY`, `DEEPSEEK_API_KEY`, and finally `OPENAI_DEFAULT_HEADERS`/`LLM_DEFAULT_HEADERS` → `openai`.

| Provider (`LLM_PROVIDER`) | Package | Credential env vars | Default model |
|---|---|---|---|
| `openai` | `@ai-sdk/openai` | `OPENAI_API_KEY` or `LLM_API_KEY` | `gpt-4o-mini` |
| `openai-compatible` | `@ai-sdk/openai-compatible` | `LLM_BASE_URL` or `OPENAI_BASE_URL` (required); `OPENAI_API_KEY`/`LLM_API_KEY` or custom headers | `gpt-4o-mini` |
| `anthropic` | `@ai-sdk/anthropic` | `ANTHROPIC_API_KEY` | `claude-3-5-haiku-latest` |
| `google` | `@ai-sdk/google` | `GOOGLE_GENERATIVE_AI_API_KEY` or `GOOGLE_API_KEY` | `gemini-2.0-flash` |
| `bedrock` | `@ai-sdk/amazon-bedrock` | Standard AWS credential chain (env / profile / role) | `anthropic.claude-3-5-haiku-20241022-v1:0` |
| `mistral` | `@ai-sdk/mistral` | `MISTRAL_API_KEY` | `mistral-small-latest` |
| `cohere` | `@ai-sdk/cohere` | `COHERE_API_KEY` | `command-r-08-2024` |
| `groq` | `@ai-sdk/groq` | `GROQ_API_KEY` | `llama-3.1-8b-instant` |
| `xai` | `@ai-sdk/xai` | `XAI_API_KEY` | `grok-2-latest` |
| `deepseek` | `@ai-sdk/deepseek` | `DEEPSEEK_API_KEY` | `deepseek-chat` |

> `LLM_*` wins over `OPENAI_*` where both exist.

#### Common env vars

| Variable | Purpose |
|----------|---------|
| `LLM_PROVIDER` | Explicit provider id from the table above. |
| `LLM_MODEL` | Overrides the per-provider default model id (applies to `createLabflowLlm()` and smart-diff). |
| `OPENAI_MODEL` | Fallback default for `createLabflowLlm()` when `LLM_MODEL` is unset. |
| `OPENAI_BASE_URL` / `LLM_BASE_URL` | Base URL for an OpenAI-compatible gateway; presence alone auto-selects the `openai-compatible` provider. |
| `OPENAI_DEFAULT_HEADERS` / `LLM_DEFAULT_HEADERS` | JSON object of extra headers merged onto OpenAI / OpenAI-compatible requests (e.g. RBAC tokens, raw `Authorization`). `LLM_*` overrides `OPENAI_*` key-by-key. |
| `LLM_PROVIDER_NAME` | Display name used when `openai-compatible` is active (defaults to `openai-compatible`). |
| `OPENAI_MAX_DIFF_CHARS` / `LLM_MAX_DIFF_CHARS` | Max size of unified diff text sent to the model (default ~120k characters). |
| `OPENAI_MAX_TOKENS` / `LLM_MAX_TOKENS` | Max completion tokens (default 4000). |

#### Example: native OpenAI

```powershell
$env:OPENAI_API_KEY = "sk-..."
# Optional: $env:LLM_MODEL = "gpt-4o"
```

#### Example: Anthropic Claude

```powershell
$env:ANTHROPIC_API_KEY = "sk-ant-..."
$env:LLM_MODEL = "claude-3-5-sonnet-latest"   # optional override
```

#### Example: company-managed OpenAI-compatible gateway

```powershell
$env:OPENAI_BASE_URL = "https://llm-gateway.company.com/v1"
$env:OPENAI_DEFAULT_HEADERS = '{"x-company-rbac":"your-rbac-token-here","Authorization":"Bearer sk-your-api-key-here"}'
# LLM_PROVIDER is auto-detected as "openai-compatible" because LLM_BASE_URL/OPENAI_BASE_URL is set.
```

#### Example: Google Gemini

```powershell
$env:GOOGLE_GENERATIVE_AI_API_KEY = "..."
$env:LLM_MODEL = "gemini-2.0-flash"
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
  // postSummaryAsMergeRequestNote: true,  // optional: POST summary as an MR note (needs PAT with `api` scope)
});

console.log(markdown);
```

Discussion-focused summary (threads + title/description):

```js
import { GitlabClient, createLabflowLlm, aiMergeRequestDiscussionDigest } from '@mcarvin/gitlab-llm-kit';

const client = new GitlabClient({ token: process.env.GITLAB_TOKEN, baseUrl: '...' });
const llm = createLabflowLlm();

const digest = await aiMergeRequestDiscussionDigest(client, llm, 'namespace/project', 42, {
  // postSummaryAsMergeRequestNote: true,  // optional: POST digest as an MR note (needs PAT with `api` scope)
});
console.log(digest);
```

Local repo (no GitLab)—re-exported from **`@mcarvin/smart-diff`**:

```js
import { summarizeGitDiff } from '@mcarvin/gitlab-llm-kit';

await summarizeGitDiff({ from: 'origin/main', to: 'HEAD', cwd: '/path/to/repo' });
```

### Posting summaries to GitLab (MR notes, issue notes, releases, wiki)

**Merge requests:** Some helpers **create a merge request note** with the generated markdown:

- `summarizeMergeRequestDiffWithSmartDiff` — set `postSummaryAsMergeRequestNote: true`.
- Merge-request insight helpers use `AiMergeRequestInsightOptions`: `aiMergeRequestDiscussionDigest`, `aiWhatChangedSinceLastReview`, `aiSuggestedMergeRequestReply`, `aiMergeRequestActionItems`, and `aiMergeRequestReviewerBriefingMeta`.

**Issues:** Issue insight helpers accept **`postSummaryAsIssueNote: true`** on **`AiIssueInsightOptions`**: `aiIssueThreadSummary`, `aiStaleIssueSummary`, and `aiIssueSuggestedNextStep`.

**Commits:** **`aiCommitCommentsDigest`** accepts **`postSummaryAsCommitNote: true`** on **`AiCommitCommentsDigestOptions`** to post the markdown as a comment on that commit SHA (via **`createCommitNote`** — `POST …/repository/commits/:sha/comments`). Requires **`api`** scope.

**Releases:** **`aiDraftReleaseNotes`** accepts **`postSummaryAsReleaseDescription: true`** on **`AiDraftReleaseNotesOptions`** to set the GitLab release **`description`** for the given tag (via **`upsertRelease`** — `PUT` if the release exists, otherwise `POST`). If the Git tag does not exist yet, pass **`releaseRef`** (branch or SHA) so GitLab can create the tag when creating the release.

**Wiki:** These accept **`postSummaryToWikiSlug`** (plus optional **`wikiPageTitle`** / **`wikiFormat`**) and write with **`upsertWikiPage`**: **`aiListReleasesOverview`** (`AiListReleasesOverviewOptions`), **`aiWikiRunbookTldr`**, **`aiWikiOutdatedDocHints`**, and **`aiSuggestMergeWikiPages`** (shared **`AiWikiInsightOptions`**; runbook also has **`AiWikiRunbookTldrOptions`** including **`wikiVersion`**). Prefer a destination slug that should receive the generated markdown (often different from the source runbook slug so you do not replace a full page with a short TL;DR).

You can also call **`createMergeRequestNote`**, **`createIssueNote`**, **`createCommitNote`**, **`upsertRelease`**, **`createWikiPage`**, **`updateWikiPage`**, or **`upsertWikiPage`** yourself. Notes use `POST …/merge_requests/…/notes`, `POST …/issues/…/notes`, or `POST …/repository/commits/…/comments` ([Commits API](https://docs.gitlab.com/ee/api/commits.html)); releases use the [Releases API](https://docs.gitlab.com/ee/api/releases.html); wiki uses the [Wikis API](https://docs.gitlab.com/ee/api/wikis.html). All require a token with the **`api`** scope; otherwise GitLab often returns **403**.

**If posting fails:** The client throws **`GitlabHttpError`** (see `GitlabHttpError` in exports). For a missing or wrong scope you typically get **`status: 403`** and a JSON **`body`** from GitLab such as `"error":"insufficient_scope"` and `"error_description":"The request requires higher privileges than provided by the access token."` Read-only scopes (e.g. `read_api` only) are enough to **fetch** project data and run the LLM, but not to **write** notes, releases, or wiki pages—use a token that includes **`api`** (full REST API access). Your GitLab version’s token UI may show other scope names; follow your admin’s guidance.

---

## What’s included

### GitLab REST helpers (`GitlabClient`)

Low-level `request` / `requestAllPages` plus typed wrappers, for example:

| Area | Exports (representative) |
|------|---------------------------|
| Merge requests | `getMergeRequest`, `listMergeRequestNotes`, `createMergeRequestNote`, `getMergeRequestChanges`, `listMergeRequestCommits`, `listMergeRequestDiscussions` |
| Issues | `getIssue`, `listIssueNotes`, `createIssueNote`, `listProjectIssues` |
| Epics | `getEpic`, `listEpicIssues`, `listGroupEpics` |
| Repository | `listCommits`, `listCommitComments`, `createCommitNote`, `getFile`, `compareRefs` |
| Releases | `getReleaseByTag`, `listReleases`, `upsertRelease` |
| Security | `listVulnerabilityFindings` |
| Wiki & snippets | `listWikiPages`, `getWikiPage`, `createWikiPage`, `updateWikiPage`, `upsertWikiPage`, `listProjectSnippets`, `getSnippet` |
| Search | `searchGitlab`, `searchInProject`, `searchInGroup` |
| Deployments | `listDeployments`, `listEnvironments` |
| Pipelines & CI jobs | `listPipelines`, `getPipeline`, `listPipelineJobs`, `getJob`, `getJobTrace` |
| Activity | `listProjectEvents`, `listGroupEvents` |
| Audit | `listProjectAuditEvents` |
| Project | `getProject`, `getReadmeFile` |

Utilities: `encodeProjectId`, `encodeGroupId`, `encodeQuery`, `GitlabHttpError`, shared **types** (`MergeRequest`, `Issue`, `Pipeline`, `PipelineJob`, …). `GitlabClient` also exposes **`requestText`** for non-JSON responses (for example job log traces).

### LLM layer

| Export | Purpose |
|--------|---------|
| `createLabflowLlm` | Build a `LabflowLlm` backed by the Vercel AI SDK. Honors `LLM_PROVIDER` / provider auto-detection (OpenAI, Anthropic, Google, Bedrock, Mistral, Cohere, Groq, xAI, DeepSeek, OpenAI-compatible). Override per call with `provider` / `defaultModel`, or bypass env with `languageModelProvider`. |
| `truncateForPrompt` | Trim long text for prompts. |
| `POLICY_*` | Optional strings for system prompts (secrets, security, human review). |
| `LlmProviderId` | Union type of supported provider ids (re-exported from smart-diff). |

### Smart diff bridge (GitLab → `@mcarvin/smart-diff`)

| Export | Purpose |
|--------|---------|
| `summarizeMergeRequestDiffWithSmartDiff` | MR `/changes` patches → `generateSummary`. Optional `postSummaryAsMergeRequestNote` posts the markdown as an MR note (PAT with **`api`** scope). Accepts smart-diff v2.1+ token-reduction controls: `diffShaping` (`stripDiffPreamble`, `maxHunkLines`), `excludeDefaultNoise`, `includeFolders`, `excludeFolders`. |
| `summarizeCompareDiffWithSmartDiff` | `/repository/compare` → `generateSummary`. Same token-reduction controls as the MR bridge. |

Because GitLab returns a pre-rendered unified diff, only `stripDiffPreamble` and `maxHunkLines` from `DiffShapingOptions` affect the bridge output. `contextLines` and `ignoreWhitespace` are git-arg flags and apply only to the local `summarizeGitDiff` pipeline.

### Insight functions (`ai…` + helpers)

These take `GitlabClient`, a `LabflowLlm` from `createLabflowLlm()`, and resource ids (project **IID** for MRs/issues where applicable).

| Area | Function | Purpose |
|------|----------|---------|
| **Merge requests** | `aiMergeRequestDiscussionDigest` | Thread + title/description digest. Optional `postSummaryAsMergeRequestNote` posts the summary as an MR note (PAT with **`api`** scope). |
| | `aiWhatChangedSinceLastReview` | Notes since a timestamp checkpoint. Optional `postSummaryAsMergeRequestNote` (PAT with **`api`** scope). |
| | `aiSuggestedMergeRequestReply` | Draft reply text. Optional post as a general MR note (not a threaded reply; PAT with **`api`** scope). |
| | `aiMergeRequestActionItems` | Extract action items. Optional `postSummaryAsMergeRequestNote` posts the checklist as an MR note (PAT with **`api`** scope). |
| | `aiMergeRequestReviewerBriefingMeta` | Reviewer briefing from metadata (no diff). Optional `postSummaryAsMergeRequestNote` (PAT with **`api`** scope). |
| **Issues** | `aiIssueThreadSummary` | Long thread summary. Optional `postSummaryAsIssueNote` (PAT with **`api`** scope). |
| | `aiStaleIssueSummary` | Staleness / closure hints. Optional `postSummaryAsIssueNote` (PAT with **`api`** scope). |
| | `aiIssueSuggestedNextStep` | Next step + closure criteria. Optional `postSummaryAsIssueNote` (PAT with **`api`** scope). |
| | `listOpenIssuesForProject` | List open (or closed) issues. |
| **Epics** | `aiEpicRoadmapRollup` | Roadmap-style rollup from child issues. |
| **Repository** | `aiCommitsReleaseNoteBullets` | Release-note style bullets from commits. |
| | `aiCommitCommentsDigest` | Summarize commit discussion comments. Optional `postSummaryAsCommitNote` posts the summary on the commit (`AiCommitCommentsDigestOptions`; PAT with **`api`** scope). |
| | `aiExplainRepositoryPath` | Explain a file path (size limits; scrub secrets). |
| | `aiCompareRefsNarrative` | Narrative between two refs (no full diff in prompt). |
| | `aiConventionalCommitNudge` | Conventional Commits suggestions from sample messages. |
| **Releases** | `aiDraftReleaseNotes` | Draft notes from tag / commits. Optional `postSummaryAsReleaseDescription` writes the draft to the GitLab release (PAT with **`api`** scope). |
| | `aiListReleasesOverview` | Cadence / naming summary from release list. Optional `postSummaryToWikiSlug` writes to a wiki page (PAT with **`api`** scope). |
| **Security & compliance** | `aiVulnerabilityFindingsBrief` | Triage-oriented finding summary. |
| | `aiAuditEventsDashboardSummary` | Audit stream summary for dashboards. |
| **Wiki & snippets** | `aiWikiRunbookTldr` | TL;DR a wiki page (runbook-style). Optional `postSummaryToWikiSlug` / `AiWikiInsightOptions` (PAT with **`api`** scope). |
| | `aiWikiOutdatedDocHints` | Stale / overlap hints from wiki index + samples. Optional wiki publish fields (`AiWikiOutdatedDocHintsOptions`). |
| | `aiSnippetTldr` | Summarize a snippet. |
| | `aiSuggestMergeWikiPages` | Suggest wiki merges / consolidation. Optional `AiWikiInsightOptions`. |
| **Search** | `aiSearchMentionBundle` | Summarize global/project search hits (“everything mentioning X”). |
| **Deployments** | `aiPostDeployIncidentBrief` | Post-deploy / incident brief from deployments + environments. |
| **Pipelines & CI jobs** | `aiPipelineRunSummary` | Pipeline-level brief: job list plus logs for failed/canceled jobs by default (`AiPipelineInsightOptions`: `maxTraceCharsPerJob`, `tracesForFailedJobsOnly`, …). |
| | `aiPipelineJobLogSummary` | Summarize a single job’s metadata and trace (errors, likely root cause). |
| **Activity** | `aiProjectWeeklyDigest` | Weekly digest from project events. |
| | `aiGroupWeeklyDigest` | Weekly digest from group events. |
| **Project docs** | `aiProjectReadmeConsistency` | README vs project metadata consistency / onboarding gaps. |

### Re-exports from `@mcarvin/smart-diff`

For local git and advanced pipelines: `summarizeGitDiff`, `generateSummary`, `getDiff`, `getDiffSummary`, `getCommits`, `getChangedFiles`, `filterCommitsByMessageRegexes`, `buildDiffPathspecs`, `buildDiffShapingGitArgs`, `shapeUnifiedDiff`, `DEFAULT_NOISE_EXCLUDES`, `createGitClient`, `getRepoRoot`, `truncateUnifiedDiffForLlm`, `resolveLlmMaxDiffChars`, `DEFAULT_GIT_DIFF_SYSTEM_PROMPT`, `LLM_GATEWAY_REQUIRED_MESSAGE`, `resolveLanguageModel`, `detectLlmProvider`, `isLlmProviderConfigured`, `defaultModelForProvider`, `resolveLlmBaseUrl`, `parseLlmDefaultHeadersFromEnv`, plus related **types** (`LlmModelProvider`, `ResolveLanguageModelOptions`, `LlmProviderId`, `SummarizeFlags`, `GenerateSummaryInput`, `CommitInfo`, `DiffSummary`, `DiffFileSummary`, `DiffPathFilter`, `DiffShapingOptions`, `GitDiffRangeQuery`, `GitDiffAiSummaryOptions`).

The authoritative list of exports is **`src/index.ts`**.

---

## Migrating from 1.x → 2.x

v2 swaps the direct `openai` SDK dependency for the Vercel AI SDK via `@mcarvin/smart-diff` v2. If you only rely on env-var configuration, your setup keeps working — `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_DEFAULT_HEADERS`, `LLM_*` equivalents, `OPENAI_MAX_DIFF_CHARS`, and `OPENAI_MAX_TOKENS` are all still honored.

Breaking changes:

- **`createLabflowLlm` no longer takes `apiKey` / `baseURL` / `defaultHeaders`.** Configure the provider with env vars (`LLM_PROVIDER`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `LLM_BASE_URL`/`OPENAI_BASE_URL`, `OPENAI_DEFAULT_HEADERS`, …) the same way `@mcarvin/smart-diff` does. The option bag now accepts `provider`, `defaultModel`, `maxUserChars`, and `languageModelProvider` (factory returning a Vercel AI SDK `LanguageModel`).
- **`summarizeMergeRequestDiffWithSmartDiff` / `summarizeCompareDiffWithSmartDiff` removed `openAiClientProvider`.** Use `llmModelProvider: () => Promise<LanguageModel>` instead, or set `LLM_PROVIDER` and the relevant provider env var. They now also accept an explicit `provider` id.
- **Removed re-exports** from smart-diff: `createOpenAiLikeClient`, `resolveOpenAiLikeClientInit`, `shouldUseLlmGateway`, `OpenAiLikeClient`, `OpenAiLikeClientInit`. Use `resolveLanguageModel`, `detectLlmProvider`, `isLlmProviderConfigured`, and `LLM_GATEWAY_REQUIRED_MESSAGE` instead (all re-exported from `@mcarvin/gitlab-llm-kit`).
- **`openai` npm package is no longer a dependency.** Remove it from your own `package.json` if you only depended on it transitively via this toolkit.

---

## Security notes

- Treat tokens and model endpoints like production secrets.
- Do not paste real credentials into issues or logs.
- Review large file / wiki content before sending to an LLM; the library includes prompt guardrails, but **you** remain responsible for data classification and retention policies at your company.

---

## License

MIT — see [LICENSE.md](https://github.com/mcarvin8/gitlab-llm-kit/blob/main/LICENSE.md).
