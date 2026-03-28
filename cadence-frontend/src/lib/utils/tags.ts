"use client";

/**
 * Extract #tags from text.
 * Tags must start with a letter and can contain letters, numbers, and underscores.
 */
export function extractTags(text: string): string[] {
  const matches = text.match(/#[a-zA-Z][a-zA-Z0-9_]*/g) || [];
  return [...new Set(matches.map((t) => t.toLowerCase()))];
}

/**
 * Get all unique tags from a set of journal entries, sorted by frequency (descending).
 */
export function getAllTags(
  entries: Record<string, { text: string }>
): { tag: string; count: number }[] {
  const tagCounts: Record<string, number> = {};
  for (const entry of Object.values(entries)) {
    if (!entry?.text) continue;
    for (const tag of extractTags(entry.text)) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }
  }
  return Object.entries(tagCounts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}
