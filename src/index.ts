/**
 * GitLab REST helpers + LLM insights powered by the Vercel AI SDK.
 * Smart diffing uses `@mcarvin/smart-diff` (any git repo or GitLab-supplied patches),
 * and the LLM layer supports OpenAI, Anthropic, Google, Bedrock, Mistral, Cohere,
 * Groq, xAI, DeepSeek, or any OpenAI-compatible gateway.
 */

export type {
  CommitInfo,
  DiffFileSummary,
  DiffPathFilter,
  DiffShapingOptions,
  DiffSummary,
  GenerateSummaryInput,
  GitDiffAiSummaryOptions,
  GitDiffRangeQuery,
  LlmModelProvider,
  ResolveLanguageModelOptions,
  SummarizeFlags,
} from "@mcarvin/smart-diff";
/** Re-export smart-diff for local git repos and advanced use. */
export {
  buildDiffPathspecs,
  buildDiffShapingGitArgs,
  createGitClient,
  DEFAULT_GIT_DIFF_SYSTEM_PROMPT,
  DEFAULT_NOISE_EXCLUDES,
  defaultModelForProvider,
  detectLlmProvider,
  filterCommitsByMessageRegexes,
  generateSummary,
  getChangedFiles,
  getCommits,
  getDiff,
  getDiffSummary,
  getRepoRoot,
  isLlmProviderConfigured,
  LLM_GATEWAY_REQUIRED_MESSAGE,
  parseLlmDefaultHeadersFromEnv,
  resolveLanguageModel,
  resolveLlmBaseUrl,
  resolveLlmMaxDiffChars,
  shapeUnifiedDiff,
  summarizeGitDiff,
  truncateUnifiedDiffForLlm,
} from "@mcarvin/smart-diff";
export {
  type CreateLabflowLlmOptions,
  createLabflowLlm,
} from "./ai/completion.js";
export {
  POLICY_DEFAULT,
  POLICY_HUMAN_REVIEW,
  POLICY_NO_SECRET_EXFILTRATION,
  POLICY_SECURITY_FINDINGS,
} from "./ai/policies.js";
export { truncateForPrompt } from "./ai/textLimits.js";
export type {
  LabflowLanguageModelProvider,
  LabflowLlm,
  LlmProviderId,
} from "./ai/types.js";
export { listProjectAuditEvents } from "./gitlab/audit.js";
export { GitlabClient, type GitlabClientOptions } from "./gitlab/client.js";
export { listDeployments, listEnvironments } from "./gitlab/deployments.js";
export { encodeGroupId, encodeProjectId } from "./gitlab/encoding.js";
export { getEpic, listEpicIssues, listGroupEpics } from "./gitlab/epics.js";
export { GitlabHttpError } from "./gitlab/errors.js";
export { listGroupEvents, listProjectEvents } from "./gitlab/events.js";
export {
  createIssueNote,
  getIssue,
  listIssueNotes,
  listProjectIssues,
} from "./gitlab/issues.js";
export {
  createMergeRequestNote,
  getMergeRequest,
  getMergeRequestChanges,
  listMergeRequestCommits,
  listMergeRequestDiscussions,
  listMergeRequestNotes,
} from "./gitlab/mergeRequests.js";
export {
  getJob,
  getJobTrace,
  getPipeline,
  listPipelineJobs,
  listPipelines,
} from "./gitlab/pipelines.js";
export { getProject, getReadmeFile } from "./gitlab/projectMeta.js";
export { encodeQuery } from "./gitlab/query.js";
export {
  getReleaseByTag,
  listReleases,
  type UpsertReleaseParams,
  upsertRelease,
} from "./gitlab/releases.js";
export {
  compareRefs,
  createCommitNote,
  getFile,
  listCommitComments,
  listCommits,
} from "./gitlab/repository.js";
export {
  type SearchScope,
  searchGitlab,
  searchInGroup,
  searchInProject,
} from "./gitlab/search.js";
export { listVulnerabilityFindings } from "./gitlab/security.js";
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
  type CreateWikiPageParams,
  createWikiPage,
  getSnippet,
  getWikiPage,
  listProjectSnippets,
  listWikiPages,
  type UpdateWikiPageParams,
  type UpsertWikiPageParams,
  updateWikiPage,
  upsertWikiPage,
} from "./gitlab/wikiAndSnippets.js";
export {
  aiGroupWeeklyDigest,
  aiProjectWeeklyDigest,
} from "./insights/activity.js";
export { aiPostDeployIncidentBrief } from "./insights/deployments.js";
export { aiEpicRoadmapRollup } from "./insights/epics.js";
export {
  type AiIssueInsightOptions,
  aiIssueSuggestedNextStep,
  aiIssueThreadSummary,
  aiStaleIssueSummary,
  listOpenIssuesForProject,
} from "./insights/issues.js";
export {
  type AiMergeRequestInsightOptions,
  aiMergeRequestActionItems,
  aiMergeRequestDiscussionDigest,
  aiMergeRequestReviewerBriefingMeta,
  aiSuggestedMergeRequestReply,
  aiWhatChangedSinceLastReview,
  type ReviewSinceOptions,
} from "./insights/mergeRequests.js";
export {
  type AiPipelineInsightOptions,
  aiPipelineJobLogSummary,
  aiPipelineRunSummary,
} from "./insights/pipelines.js";
export { aiProjectReadmeConsistency } from "./insights/projectDoc.js";
export {
  type AiDraftReleaseNotesOptions,
  type AiListReleasesOverviewOptions,
  aiDraftReleaseNotes,
  aiListReleasesOverview,
} from "./insights/releases.js";
export {
  type AiCommitCommentsDigestOptions,
  aiCommitCommentsDigest,
  aiCommitsReleaseNoteBullets,
  aiCompareRefsNarrative,
  aiConventionalCommitNudge,
  aiExplainRepositoryPath,
  type ExplainPathOptions,
} from "./insights/repository.js";
export { aiSearchMentionBundle } from "./insights/searchBundle.js";
export {
  aiAuditEventsDashboardSummary,
  aiVulnerabilityFindingsBrief,
} from "./insights/security.js";
export {
  type AiWikiInsightOptions,
  type AiWikiOutdatedDocHintsOptions,
  type AiWikiRunbookTldrOptions,
  aiSnippetTldr,
  aiSuggestMergeWikiPages,
  aiWikiOutdatedDocHints,
  aiWikiRunbookTldr,
} from "./insights/wiki.js";
export {
  type SummarizeCompareDiffOptions,
  type SummarizeGitLabMergeRequestDiffOptions,
  summarizeCompareDiffWithSmartDiff,
  summarizeMergeRequestDiffWithSmartDiff,
} from "./integrations/smartDiffBridge.js";
