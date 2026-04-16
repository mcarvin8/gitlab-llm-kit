const DEFAULT_MAX = 120_000;

/** Trim long text for prompts (characters, not bytes). */
export function truncateForPrompt(text: string, maxChars: number = DEFAULT_MAX): string {
  if (text.length <= maxChars) {
    return text;
  }
  return `${text.slice(0, maxChars)}\n\n[Truncated: ${text.length} chars → ${maxChars}]`;
}
