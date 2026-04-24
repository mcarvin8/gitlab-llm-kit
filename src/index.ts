/**
 * GitLab REST helpers + LLM insights powered by the Vercel AI SDK.
 * Smart diffing uses `@mcarvin/smart-diff` (any git repo or GitLab-supplied patches),
 * and the LLM layer supports OpenAI, Anthropic, Google, Bedrock, Mistral, Cohere,
 * Groq, xAI, DeepSeek, or any OpenAI-compatible gateway.
 */

export { GitlabClient, type GitlabClientOptions } from "./gitlab/client.js";
export { GitlabHttpError } from "./gitlab/errors.js";
export { encodeProjectId, encodeGroupId } from "./gitlab/encoding.js";
export { encodeQuery } from "./gitlab/query.js";
export type {
  AuditEvent,
  Blob,
  Commit,
  Deployment,
  Environment,
  Epic,
  Event,
  Issue,
  MergeRequest,
  MergeRequestChange,
  Note,
  Pipeline,
  PipelineJob,
  Project,
  Release,
  RepositoryCompare,
  Snippet,
  VulnerabilityFinding,
  WikiPage,
} from "./gitlab/types.js";

export {
  getMergeRequest,
  listMergeRequestNotes,
  createMergeRequestNote,
  getMergeRequestChanges,
  listMergeRequestCommits,
  listMergeRequestDiscussions,
} from "./gitlab/mergeRequests.js";
export {
  getIssue,
  listIssueNotes,
  createIssueNote,
  listProjectIssues,
} from "./gitlab/issues.js";
export {
  getEpic,
  listEpicIssues,
  listGroupEpics,
} from "./gitlab/epics.js";
export {
  listCommits,
  listCommitComments,
  createCommitNote,
  getFile,
  compareRefs,
} from "./gitlab/repository.js";
export {
  getReleaseByTag,
  listReleases,
  upsertRelease,
  type UpsertReleaseParams,
} from "./gitlab/releases.js";
export { listVulnerabilityFindings } from "./gitlab/security.js";
export {
  listWikiPages,
  getWikiPage,
  createWikiPage,
  updateWikiPage,
  upsertWikiPage,
  type CreateWikiPageParams,
  type UpdateWikiPageParams,
  type UpsertWikiPageParams,
  listProjectSnippets,
  getSnippet,
} from "./gitlab/wikiAndSnippets.js";
export { searchGitlab, searchInProject, searchInGroup, type SearchScope } from "./gitlab/search.js";
export { listDeployments, listEnvironments } from "./gitlab/deployments.js";
export {
  listPipelines,
  getPipeline,
  listPipelineJobs,
  getJob,
  getJobTrace,
} from "./gitlab/pipelines.js";
export { listProjectEvents, listGroupEvents } from "./gitlab/events.js";
export { listProjectAuditEvents } from "./gitlab/audit.js";
export { getProject, getReadmeFile } from "./gitlab/projectMeta.js";

export type {
  LabflowLlm,
  LabflowLanguageModelProvider,
  LlmProviderId,
} from "./ai/types.js";
export {
  POLICY_DEFAULT,
  POLICY_HUMAN_REVIEW,
  POLICY_NO_SECRET_EXFILTRATION,
  POLICY_SECURITY_FINDINGS,
} from "./ai/policies.js";
export { truncateForPrompt } from "./ai/textLimits.js";
export { createLabflowLlm, type CreateLabflowLlmOptions } from "./ai/completion.js";

export {
  summarizeMergeRequestDiffWithSmartDiff,
  summarizeCompareDiffWithSmartDiff,
  type SummarizeGitLabMergeRequestDiffOptions,
  type SummarizeCompareDiffOptions,
} from "./integrations/smartDiffBridge.js";

export {
  aiMergeRequestDiscussionDigest,
  aiWhatChangedSinceLastReview,
  aiSuggestedMergeRequestReply,
  aiMergeRequestActionItems,
  aiMergeRequestReviewerBriefingMeta,
  type AiMergeRequestInsightOptions,
  type ReviewSinceOptions,
} from "./insights/mergeRequests.js";

export {
  aiIssueThreadSummary,
  aiStaleIssueSummary,
  aiIssueSuggestedNextStep,
  listOpenIssuesForProject,
  type AiIssueInsightOptions,
} from "./insights/issues.js";

export { aiEpicRoadmapRollup } from "./insights/epics.js";

export {
  aiCommitsReleaseNoteBullets,
  aiCommitCommentsDigest,
  aiExplainRepositoryPath,
  aiCompareRefsNarrative,
  aiConventionalCommitNudge,
  type AiCommitCommentsDigestOptions,
  type ExplainPathOptions,
} from "./insights/repository.js";

export {
  aiDraftReleaseNotes,
  aiListReleasesOverview,
  type AiDraftReleaseNotesOptions,
  type AiListReleasesOverviewOptions,
} from "./insights/releases.js";

export {
  aiVulnerabilityFindingsBrief,
  aiAuditEventsDashboardSummary,
} from "./insights/security.js";

export {
  aiWikiRunbookTldr,
  aiWikiOutdatedDocHints,
  aiSnippetTldr,
  aiSuggestMergeWikiPages,
  type AiWikiInsightOptions,
  type AiWikiRunbookTldrOptions,
  type AiWikiOutdatedDocHintsOptions,
} from "./insights/wiki.js";

export { aiSearchMentionBundle } from "./insights/searchBundle.js";

export { aiPostDeployIncidentBrief } from "./insights/deployments.js";

export {
  aiPipelineJobLogSummary,
  aiPipelineRunSummary,
  type AiPipelineInsightOptions,
} from "./insights/pipelines.js";

export {
  aiProjectWeeklyDigest,
  aiGroupWeeklyDigest,
} from "./insights/activity.js";

export { aiProjectReadmeConsistency } from "./insights/projectDoc.js";

/** Re-export smart-diff for local git repos and advanced use. */
export {
  summarizeGitDiff,
  generateSummary,
  getDiff,
  getDiffSummary,
  getCommits,
  getChangedFiles,
  filterCommitsByMessageRegexes,
  buildDiffPathspecs,
  buildDiffShapingGitArgs,
  shapeUnifiedDiff,
  DEFAULT_NOISE_EXCLUDES,
  createGitClient,
  getRepoRoot,
  truncateUnifiedDiffForLlm,
  resolveLlmMaxDiffChars,
  DEFAULT_GIT_DIFF_SYSTEM_PROMPT,
  LLM_GATEWAY_REQUIRED_MESSAGE,
  resolveLanguageModel,
  detectLlmProvider,
  isLlmProviderConfigured,
  defaultModelForProvider,
  resolveLlmBaseUrl,
  parseLlmDefaultHeadersFromEnv,
} from "@mcarvin/smart-diff";

export type {
  GitDiffAiSummaryOptions,
  CommitInfo,
  DiffSummary,
  DiffFileSummary,
  DiffPathFilter,
  DiffShapingOptions,
  GitDiffRangeQuery,
  GenerateSummaryInput,
  SummarizeFlags,
  LlmModelProvider,
  ResolveLanguageModelOptions,
} from "@mcarvin/smart-diff";
