/** GitLab REST helpers + LLM insights. Smart diffing uses `@mcarvin/smart-diff` (any git repo or GitLab-supplied patches). */

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
  getMergeRequestChanges,
  listMergeRequestCommits,
  listMergeRequestDiscussions,
} from "./gitlab/mergeRequests.js";
export { getIssue, listIssueNotes, listProjectIssues } from "./gitlab/issues.js";
export {
  getEpic,
  listEpicIssues,
  listGroupEpics,
} from "./gitlab/epics.js";
export {
  listCommits,
  listCommitComments,
  getFile,
  compareRefs,
} from "./gitlab/repository.js";
export { getReleaseByTag, listReleases } from "./gitlab/releases.js";
export { listVulnerabilityFindings } from "./gitlab/security.js";
export {
  listWikiPages,
  getWikiPage,
  listProjectSnippets,
  getSnippet,
} from "./gitlab/wikiAndSnippets.js";
export { searchGitlab, searchInProject, searchInGroup, type SearchScope } from "./gitlab/search.js";
export { listDeployments, listEnvironments } from "./gitlab/deployments.js";
export { listProjectEvents, listGroupEvents } from "./gitlab/events.js";
export { listProjectAuditEvents } from "./gitlab/audit.js";
export { getProject, getReadmeFile } from "./gitlab/projectMeta.js";

export type { LabflowLlm } from "./ai/types.js";
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
  type ReviewSinceOptions,
} from "./insights/mergeRequests.js";

export {
  aiIssueThreadSummary,
  aiStaleIssueSummary,
  aiIssueSuggestedNextStep,
  listOpenIssuesForProject,
} from "./insights/issues.js";

export { aiEpicRoadmapRollup } from "./insights/epics.js";

export {
  aiCommitsReleaseNoteBullets,
  aiCommitCommentsDigest,
  aiExplainRepositoryPath,
  aiCompareRefsNarrative,
  aiConventionalCommitNudge,
  type ExplainPathOptions,
} from "./insights/repository.js";

export { aiDraftReleaseNotes, aiListReleasesOverview } from "./insights/releases.js";

export {
  aiVulnerabilityFindingsBrief,
  aiAuditEventsDashboardSummary,
} from "./insights/security.js";

export {
  aiWikiRunbookTldr,
  aiWikiOutdatedDocHints,
  aiSnippetTldr,
  aiSuggestMergeWikiPages,
} from "./insights/wiki.js";

export { aiSearchMentionBundle } from "./insights/searchBundle.js";

export { aiPostDeployIncidentBrief } from "./insights/deployments.js";

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
  createGitClient,
  getRepoRoot,
  truncateUnifiedDiffForLlm,
  resolveLlmMaxDiffChars,
  DEFAULT_GIT_DIFF_SYSTEM_PROMPT,
  createOpenAiLikeClient,
  resolveOpenAiLikeClientInit,
  shouldUseLlmGateway,
} from "@mcarvin/smart-diff";

export type {
  GitDiffAiSummaryOptions,
  CommitInfo,
  DiffSummary,
  GenerateSummaryInput,
  SummarizeFlags,
  OpenAiLikeClient,
  OpenAiLikeClientInit,
} from "@mcarvin/smart-diff";
