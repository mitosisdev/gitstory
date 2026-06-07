// src/since.ts — --since flag helpers: parse and apply a SinceFilter.

import type { Commit } from "./parser.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SinceFilter =
  | { type: "count"; value: number }
  | { type: "days"; value: number }
  | { type: "ref"; value: string };

// ---------------------------------------------------------------------------
// parseSince — categorise the raw --since string
//
//   "50"     → { type: "count", value: 50 }   (pure integer)
//   "90d"    → { type: "days",  value: 90 }   (digits followed by 'd')
//   "v1.0.0" → { type: "ref",   value: "v1.0.0" }  (anything else)
// ---------------------------------------------------------------------------

export function parseSince(raw: string): SinceFilter {
  // Pure integer → commit count
  if (/^\d+$/.test(raw)) {
    return { type: "count", value: parseInt(raw, 10) };
  }

  // Digits followed by 'd' → days (case-insensitive)
  const daysMatch = /^(\d+)d$/i.exec(raw);
  if (daysMatch) {
    return { type: "days", value: parseInt(daysMatch[1]!, 10) };
  }

  // Everything else → git ref
  return { type: "ref", value: raw };
}

// ---------------------------------------------------------------------------
// applySince — filter an in-memory Commit[] given a SinceFilter.
//
// Assumptions:
//   - commits are ordered newest-first (as git log returns them by default)
//   - type="ref" is handled upstream by passing the ref to git log; this
//     function is a no-op in that case.
//   - nowOverride is accepted so unit tests can pass a fixed reference date.
// ---------------------------------------------------------------------------

export function applySince(
  commits: Commit[],
  filter: SinceFilter | undefined,
  nowOverride?: Date
): Commit[] {
  if (!filter) return commits;

  switch (filter.type) {
    case "count":
      return commits.slice(0, filter.value);

    case "days": {
      const now = nowOverride ?? new Date();
      const cutoffMs = now.getTime() - filter.value * 24 * 60 * 60 * 1000;
      return commits.filter((c) => new Date(c.isoTimestamp).getTime() >= cutoffMs);
    }

    case "ref":
      // git log was already invoked with the ref range — nothing to do here.
      return commits;
  }
}
