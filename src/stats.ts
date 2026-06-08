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

export interface MonthStat {
  month: string;    // YYYY-MM
  count: number;
  topAuthor: string;
}

/**
 * Per-month commit breakdown, sorted newest-first.
 * Returns up to all months present in the data.
 * Author names are truncated to 20 characters.
 * Ties for top author are broken alphabetically (first name wins).
 */
export function commitsByMonth(records: CommitRecord[]): MonthStat[] {
  if (records.length === 0) return [];

  // Accumulate per-month author counts: month → Map<author, count>
  const monthMap = new Map<string, Map<string, number>>();

  for (const r of records) {
    const d = r.date;
    const month = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    let authorMap = monthMap.get(month);
    if (!authorMap) {
      authorMap = new Map();
      monthMap.set(month, authorMap);
    }
    authorMap.set(r.author, (authorMap.get(r.author) ?? 0) + 1);
  }

  const result: MonthStat[] = [];
  for (const [month, authorMap] of monthMap) {
    let topAuthor = "";
    let topCount = 0;
    for (const [author, count] of authorMap) {
      if (
        count > topCount ||
        (count === topCount && author < topAuthor)
      ) {
        topAuthor = author;
        topCount = count;
      }
    }
    const truncated = topAuthor.length > 20 ? topAuthor.slice(0, 20) : topAuthor;
    result.push({ month, count: [...authorMap.values()].reduce((a, b) => a + b, 0), topAuthor: truncated });
  }

  // Sort newest-first
  result.sort((a, b) => b.month.localeCompare(a.month));

  return result;
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
