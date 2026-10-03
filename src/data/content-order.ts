export interface DatedContent { publishedAt: string; slug: string }

export function newestFirst<T extends DatedContent>(items: readonly T[]): T[] {
  // ISO calendar dates sort independently of browser locale/timezone. Invalid dates
  // sort last; equal dates use the canonical slug for deterministic ordering.
  const date = (item: T) => /^\d{4}-\d{2}-\d{2}$/.test(item.publishedAt) && Number.isFinite(Date.parse(item.publishedAt)) ? item.publishedAt : '';
  return [...items].sort((a, b) => date(b).localeCompare(date(a)) || a.slug.localeCompare(b.slug));
}
