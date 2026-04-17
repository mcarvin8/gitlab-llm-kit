import type { LabflowLlm } from "../ai/types.js";
import { POLICY_DEFAULT, POLICY_NO_SECRET_EXFILTRATION } from "../ai/policies.js";
import { truncateForPrompt } from "../ai/textLimits.js";
import type { GitlabClient } from "../gitlab/client.js";
import {
  getJob,
  getJobTrace,
  getPipeline,
  listPipelineJobs,
} from "../gitlab/pipelines.js";
import type { PipelineJob } from "../gitlab/types.js";

function jobNeedsFailureAnalysis(status: string): boolean {
  return status === "failed" || status === "canceled";
}

export type AiPipelineInsightOptions = {
  model?: string;
  maxPromptChars?: number;
  /**
   * Max characters of log text per job when attaching traces (default 32_000).
   * Applied before the global {@link maxPromptChars} cap.
   */
  maxTraceCharsPerJob?: number;
  /**
   * When true (default), fetch and attach job logs only for failed or canceled jobs.
   * When false, attach a truncated trace for every job (can be very large).
   */
  tracesForFailedJobsOnly?: boolean;
};

function formatJobHeader(j: PipelineJob): string {
  const url = j.web_url ? ` ${j.web_url}` : "";
  const fr = j.failure_reason ? ` failure_reason=${j.failure_reason}` : "";
  return `- [${j.stage ?? "stage?"}] ${j.name} — ${j.status}${fr}${url}`;
}

/**
 * Summarize a single CI job log: what happened, errors, and likely root cause if it failed.
 */
export async function aiPipelineJobLogSummary(
  client: GitlabClient,
  llm: LabflowLlm,
  projectId: string | number,
  jobId: number,
  options?: AiPipelineInsightOptions,
): Promise<string> {
  const job = await getJob(client, projectId, jobId);
  const trace = await getJobTrace(client, projectId, jobId).catch(() => "");
  const perJobCap = options?.maxTraceCharsPerJob ?? 32_000;
  const logBlock = truncateForPrompt(trace, perJobCap);

  const user = [
    "## Job metadata",
    formatJobHeader(job),
    job.ref ? `ref: ${job.ref}` : "",
    job.started_at ? `started_at: ${job.started_at}` : "",
    job.finished_at ? `finished_at: ${job.finished_at}` : "",
    "## Job log (trace)",
    logBlock || "(empty or unavailable)",
  ]
    .filter(Boolean)
    .join("\n");

  const prompt = truncateForPrompt(user, options?.maxPromptChars ?? 120_000);

  return llm({
    model: options?.model,
    system: `${POLICY_DEFAULT}\n${POLICY_NO_SECRET_EXFILTRATION}\nYou are reviewing a GitLab CI job log.\nSummarize in Markdown: purpose of the job, key steps, outcome, and if it failed the most likely root cause and concrete next checks. If the log was truncated, say so. Do not invent commands or URLs not supported by the log.`,
    user: prompt,
  });
}

/**
 * High-level summary of a pipeline run: stages, job outcomes, and for failures why they likely failed (from job logs).
 * Use this after a failed deployment or broken pipeline to get an LLM-readable brief.
 */
export async function aiPipelineRunSummary(
  client: GitlabClient,
  llm: LabflowLlm,
  projectId: string | number,
  pipelineId: number,
  options?: AiPipelineInsightOptions,
): Promise<string> {
  const pipeline = await getPipeline(client, projectId, pipelineId);
  const jobs = await listPipelineJobs(client, projectId, pipelineId);
  const failedOnly = options?.tracesForFailedJobsOnly !== false;
  const perJobCap = options?.maxTraceCharsPerJob ?? 32_000;

  const lines: string[] = [
    "## Pipeline",
    `- id=${pipeline.id} iid=${pipeline.iid} status=${pipeline.status}`,
    pipeline.ref ? `ref: ${pipeline.ref}` : "",
    pipeline.sha ? `sha: ${pipeline.sha}` : "",
    pipeline.web_url ? `url: ${pipeline.web_url}` : "",
    "",
    "## Jobs (overview)",
    ...jobs.map((j) => formatJobHeader(j)),
    "",
  ].filter((x) => x !== "");

  const traceSections: string[] = [];

  for (const j of jobs) {
    const wantTrace = failedOnly ? jobNeedsFailureAnalysis(j.status) : true;
    if (!wantTrace) {
      continue;
    }
    let trace = "";
    try {
      trace = await getJobTrace(client, projectId, j.id);
    } catch {
      trace = "(trace unavailable)";
    }
    const snippet = truncateForPrompt(trace, perJobCap);
    traceSections.push(
      `### Log: [${j.stage ?? "?"}] ${j.name} (${j.status})\n${snippet}`,
    );
  }

  if (traceSections.length > 0) {
    lines.push("## Job logs");
    lines.push(...traceSections);
  } else {
    lines.push("## Job logs");
    lines.push(
      "(No failed or canceled jobs in this run — job logs were not attached. Pass `tracesForFailedJobsOnly: false` if you need full traces for every job.)",
    );
  }

  const user = truncateForPrompt(lines.join("\n"), options?.maxPromptChars ?? 120_000);

  return llm({
    model: options?.model,
    system: `${POLICY_DEFAULT}\n${POLICY_NO_SECRET_EXFILTRATION}\nYou are reviewing a GitLab CI pipeline and selected job logs.\nProduce a concise Markdown brief: overall pipeline outcome, stage-by-stage picture, which jobs failed or were skipped, and for failures the likely root cause from the logs. If this run blocked a deployment, state that clearly. If logs are missing or truncated, say so. Do not invent failing commands or infrastructure details not present in the text.`,
    user,
  });
}
