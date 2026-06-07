import { describe, expect, it } from "bun:test";
import { parseSince, applySince, type SinceFilter } from "./since.js";
import type { Commit } from "./parser.js";

// ---------------------------------------------------------------------------
// parseSince — categorise the raw --since value
// ---------------------------------------------------------------------------

describe("parseSince", () => {
  it("numeric string → count", () => {
    expect(parseSince("50")).toEqual({ type: "count", value: 50 });
  });

  it("'0' → count 0", () => {
    expect(parseSince("0")).toEqual({ type: "count", value: 0 });
  });

  it("'1' → count 1", () => {
    expect(parseSince("1")).toEqual({ type: "count", value: 1 });
  });

  it("days string → days", () => {
    expect(parseSince("90d")).toEqual({ type: "days", value: 90 });
  });

  it("'7d' → days 7", () => {
    expect(parseSince("7d")).toEqual({ type: "days", value: 7 });
  });

  it("'1d' → days 1", () => {
    expect(parseSince("1d")).toEqual({ type: "days", value: 1 });
  });

  it("git ref string → ref", () => {
    expect(parseSince("v1.0.0")).toEqual({ type: "ref", value: "v1.0.0" });
  });

  it("'main' → ref", () => {
    expect(parseSince("main")).toEqual({ type: "ref", value: "main" });
  });

  it("'abc1234' (looks like a sha) → ref", () => {
    expect(parseSince("abc1234")).toEqual({ type: "ref", value: "abc1234" });
  });

  it("'HEAD~10' → ref", () => {
    expect(parseSince("HEAD~10")).toEqual({ type: "ref", value: "HEAD~10" });
  });
});

// ---------------------------------------------------------------------------
// applySince — filter a Commit[] given a SinceFilter
// ---------------------------------------------------------------------------

function makeCommit(sha: string, isoTimestamp: string): Commit {
  return { sha, authorName: "A", authorEmail: "a@b.com", isoTimestamp, subject: sha };
}

// Build a list of commits ordered newest → oldest (as git log returns them)
const NOW = new Date("2026-06-07T12:00:00Z");

function daysAgo(n: number): string {
  const d = new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000);
  return d.toISOString();
}

const COMMITS_10: Commit[] = [
  makeCommit("c10", daysAgo(1)),
  makeCommit("c09", daysAgo(3)),
  makeCommit("c08", daysAgo(5)),
  makeCommit("c07", daysAgo(10)),
  makeCommit("c06", daysAgo(20)),
  makeCommit("c05", daysAgo(40)),
  makeCommit("c04", daysAgo(60)),
  makeCommit("c03", daysAgo(80)),
  makeCommit("c02", daysAgo(100)),
  makeCommit("c01", daysAgo(120)),
];

describe("applySince — count", () => {
  it("returns last N commits (head of array = newest)", () => {
    const filter: SinceFilter = { type: "count", value: 5 };
    const result = applySince(COMMITS_10, filter);
    expect(result).toHaveLength(5);
    expect(result[0].sha).toBe("c10");
    expect(result[4].sha).toBe("c06");
  });

  it("count larger than array → returns all", () => {
    const filter: SinceFilter = { type: "count", value: 50 };
    const result = applySince(COMMITS_10, filter);
    expect(result).toHaveLength(10);
  });

  it("count 0 → returns empty", () => {
    const filter: SinceFilter = { type: "count", value: 0 };
    const result = applySince(COMMITS_10, filter);
    expect(result).toHaveLength(0);
  });

  it("count 1 → returns most recent commit", () => {
    const filter: SinceFilter = { type: "count", value: 1 };
    const result = applySince(COMMITS_10, filter);
    expect(result).toHaveLength(1);
    expect(result[0].sha).toBe("c10");
  });
});

describe("applySince — days", () => {
  it("returns commits within N days", () => {
    // Using a fixed reference date so the test is deterministic
    const filter: SinceFilter = { type: "days", value: 30 };
    // c10=1d, c09=3d, c08=5d, c07=10d, c06=20d → 5 commits within 30 days
    const result = applySince(COMMITS_10, filter, NOW);
    expect(result).toHaveLength(5);
    expect(result[0].sha).toBe("c10");
    expect(result[4].sha).toBe("c06");
  });

  it("days filter: commit exactly at boundary (== N days) is included", () => {
    // c05 is 40 days ago, filter = 40 → should include c05 too (<=)
    const filter: SinceFilter = { type: "days", value: 40 };
    const result = applySince(COMMITS_10, filter, NOW);
    // c10(1), c09(3), c08(5), c07(10), c06(20), c05(40) → 6
    expect(result).toHaveLength(6);
    expect(result[5].sha).toBe("c05");
  });

  it("days filter with no matching commits → returns empty", () => {
    const filter: SinceFilter = { type: "days", value: 0 };
    const result = applySince(COMMITS_10, filter, NOW);
    expect(result).toHaveLength(0);
  });

  it("days filter covering all commits → returns all", () => {
    const filter: SinceFilter = { type: "days", value: 200 };
    const result = applySince(COMMITS_10, filter, NOW);
    expect(result).toHaveLength(10);
  });
});

describe("applySince — ref", () => {
  // ref filtering is handled by git itself (we just pass --since=<ref> or use
  // the ref as a revision range). applySince with type=ref is a no-op on the
  // in-memory array because the filtering was already done by git log.
  it("ref filter is a no-op on the commit array (git handled it)", () => {
    const filter: SinceFilter = { type: "ref", value: "v1.0.0" };
    const result = applySince(COMMITS_10, filter);
    expect(result).toHaveLength(10);
  });
});

describe("applySince — no filter", () => {
  it("undefined filter → returns array unchanged", () => {
    const result = applySince(COMMITS_10, undefined);
    expect(result).toHaveLength(10);
  });
});
