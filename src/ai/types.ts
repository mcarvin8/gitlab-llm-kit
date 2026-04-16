/**
 * Pluggable LLM caller for GitLab insights. Swap for tests or a gateway;
 * default uses the OpenAI SDK and `OPENAI_API_KEY`.
 */
export type LabflowLlm = (input: {
  system: string;
  user: string;
  model?: string;
}) => Promise<string>;
