// src/stats.ts — compute statistics from parsed git commit records

export interface CommitRecord {
  hash: string;
  author: string;
  date: Date;
  message: string;
}

/**
 * Total number of commits in the records array.
 */
export function totalCommits(records: CommitRecord[]): number {
  return records.length;
}

/**
 * Date range spanned by the records.
 * Returns null if records is empty.
 * `days` is the number of whole calendar days between first and last commit.
 */
export function dateRange(
  records: CommitRecord[]
): { first: Date; last: Date; days: number } | null {
  if (records.length === 0) return null;

  let first = records[0].date;
  let last = records[0].date;

  for (const r of records) {
    if (r.date < first) first = r.date;
    if (r.date > last) last = r.date;
  }

  const msPerDay = 1000 * 60 * 60 * 24;
  const days = Math.round((last.getTime() - first.getTime()) / msPerDay);

  return { first, last, days };
}

/**
 * Commit count per author, sorted by count descending.
 */
export function commitsByAuthor(
  records: CommitRecord[]
): { author: string; count: number }[] {
  const counts = new Map<string, number>();

  for (const r of records) {
    counts.set(r.author, (counts.get(r.author) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([author, count]) => ({ author, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Average commits per day over the date range.
 * Returns 0 for empty input or when all commits fall on the same day (0-day span).
 */
export function commitFrequency(records: CommitRecord[]): number {
  if (records.length === 0) return 0;

  const range = dateRange(records);
  if (!range || range.days === 0) return 0;

  return records.length / range.days;
}
