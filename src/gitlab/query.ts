export function encodeQuery(
  params: Record<string, string | number | boolean | undefined>,
): string {
  const pairs: string[] = [];
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined) {
      continue;
    }
    pairs.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  }
  return pairs.length ? `?${pairs.join("&")}` : "";
}
