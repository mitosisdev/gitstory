// src/stats-format.ts — render a CLI-printable stats report from commit records.
//
// Produces a one-line summary (totals · contributors · top author) followed by
// an aligned per-month breakdown table:
//
//   Month       Commits  Top Author
//   ----------  -------  --------------------
//   2026-06           2  alice
//   2026-05           3  bob
//
// The table is identical in shape to the one emitted inline by src/cli.ts so the
// shipped binary (bin/gitstory.ts) and the dev CLI stay consistent.

import { commitsByAuthor, commitsByMonth } from "./stats.js";
import type { CommitRecord } from "./stats.js";

const SHOW_MONTHS = 12;
const COL_MONTH = 10;
const COL_COUNT = 7;
const COL_AUTHOR = 20;
const GAP = "  ";

/**
 * Build the full stats report string (summary line + per-month table).
 * For empty input, returns only the summary line (no table).
 */
export function formatStats(records: CommitRecord[]): string {
  const total = records.length;
  const byAuthor = commitsByAuthor(records);
  const contributorCount = byAuthor.length;
  const top = byAuthor[0];
  const topStr = top ? `${top.author} (${top.count} commits)` : "none";

  const summary =
    `${total} commits · ${contributorCount} ` +
    `contributor${contributorCount !== 1 ? "s" : ""} · top: ${topStr}`;

  const byMonth = commitsByMonth(records).slice(0, SHOW_MONTHS);
  if (byMonth.length === 0) {
    return summary;
  }

  const header =
    "Month".padEnd(COL_MONTH) +
    GAP +
    "Commits".padStart(COL_COUNT) +
    GAP +
    "Top Author".padEnd(COL_AUTHOR);

  const divider =
    "-".repeat(COL_MONTH) +
    GAP +
    "-".repeat(COL_COUNT) +
    GAP +
    "-".repeat(COL_AUTHOR);

  const rows = byMonth.map(
    (row) =>
      row.month.padEnd(COL_MONTH) +
      GAP +
      String(row.count).padStart(COL_COUNT) +
      GAP +
      row.topAuthor.padEnd(COL_AUTHOR)
  );

  return [summary, header, divider, ...rows].join("\n");
}
