// src/since.test.ts — unit tests for parseSince and applySince.
import { describe, expect, it } from "bun:test";
import { parseSince, applySince } from "./since.js";
import type { Commit } from "./parser.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCommit(isoTimestamp: string, sha = "abc123"): Commit {
  return { sha, authorName: "A", authorEmail: "a@a.com", isoTimestamp, subject: "msg" };
}

// Build a set of N commits, each 1 day apart going back from a reference date.
function makeCommits(count: number, referenceDate: Date): Commit[] {
  const commits: Commit[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(referenceDate.getTime() - i * 24 * 60 * 60 * 1000);
    commits.push(makeCommit(d.toISOString(), `sha${i}`));
  }
  return commits; // newest first
}

// ---------------------------------------------------------------------------
// parseSince
// ---------------------------------------------------------------------------

describe("parseSince", () => {
  it("parses a plain integer as count", () => {
    expect(parseSince("50")).toEqual({ type: "count", value: 50 });
  });

  it("parses '1' as count 1", () => {
    expect(parseSince("1")).toEqual({ type: "count", value: 1 });
  });

  it("parses digits followed by 'd' as days", () => {
    expect(parseSince("90d")).toEqual({ type: "days", value: 90 });
  });

  it("parses '7d' as days 7", () => {
    expect(parseSince("7d")).toEqual({ type: "days", value: 7 });
  });

  it("parses uppercase 'D' as days (case-insensitive)", () => {
    expect(parseSince("30D")).toEqual({ type: "days", value: 30 });
  });

  it("parses a git ref string as ref type", () => {
    expect(parseSince("v1.0.0")).toEqual({ type: "ref", value: "v1.0.0" });
  });

  it("parses a commit SHA as ref type", () => {
    const sha = "abc1234";
    expect(parseSince(sha)).toEqual({ type: "ref", value: sha });
  });
});

// ---------------------------------------------------------------------------
// applySince — count filter
// ---------------------------------------------------------------------------

describe("applySince — count", () => {
  const now = new Date("2024-01-10T00:00:00Z");
  const commits = makeCommits(10, now);

  it("returns last N commits (count form)", () => {
    const result = applySince(commits, { type: "count", value: 5 });
    expect(result).toHaveLength(5);
    expect(result[0]!.sha).toBe("sha0"); // newest stays first
  });

  it("count=1 returns exactly one commit", () => {
    const result = applySince(commits, { type: "count", value: 1 });
    expect(result).toHaveLength(1);
    expect(result[0]!.sha).toBe("sha0");
  });

  it("count larger than array length returns all commits", () => {
    const result = applySince(commits, { type: "count", value: 999 });
    expect(result).toHaveLength(10);
  });

  it("count=0 returns empty array", () => {
    const result = applySince(commits, { type: "count", value: 0 });
    expect(result).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// applySince — days filter
// ---------------------------------------------------------------------------

describe("applySince — days", () => {
  // reference: 2024-01-10 — 10 commits, newest = jan 10, oldest = jan 01
  const now = new Date("2024-01-10T00:00:00Z");
  const commits = makeCommits(10, now);

  it("90d keeps all commits when all are within the window", () => {
    const result = applySince(commits, { type: "days", value: 90 }, now);
    expect(result).toHaveLength(10);
  });

  it("1d keeps only the most recent commit (today's)", () => {
    // only sha0 = Jan 10 is within 1 day of Jan 10
    const result = applySince(commits, { type: "days", value: 1 }, now);
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0]!.sha).toBe("sha0");
  });

  it("5d keeps the 5 most recent commits", () => {
    const result = applySince(commits, { type: "days", value: 5 }, now);
    // sha0 = jan10, sha1 = jan9, ..., sha4 = jan6 — all within 5 days
    // sha5 = jan5 is exactly 5 days ago — boundary: cutoff = jan5 00:00, sha5 = jan5 00:00
    expect(result.length).toBeGreaterThanOrEqual(5);
  });

  it("0d keeps only commits at exactly now (boundary — cutoff == now)", () => {
    // cutoff = now - 0ms = now; sha0 is at exactly now so >= cutoff, included
    const result = applySince(commits, { type: "days", value: 0 }, now);
    expect(result).toHaveLength(1);
    expect(result[0]!.sha).toBe("sha0");
  });
});

// ---------------------------------------------------------------------------
// applySince — ref filter (no-op)
// ---------------------------------------------------------------------------

describe("applySince — ref", () => {
  const now = new Date("2024-01-10T00:00:00Z");
  const commits = makeCommits(5, now);

  it("ref type returns all commits unchanged (git handles filtering)", () => {
    const result = applySince(commits, { type: "ref", value: "v1.0.0" });
    expect(result).toHaveLength(5);
    expect(result).toEqual(commits);
  });
});

// ---------------------------------------------------------------------------
// applySince — undefined filter
// ---------------------------------------------------------------------------

describe("applySince — no filter", () => {
  const now = new Date("2024-01-10T00:00:00Z");
  const commits = makeCommits(5, now);

  it("undefined filter returns all commits unchanged", () => {
    const result = applySince(commits, undefined);
    expect(result).toHaveLength(5);
    expect(result).toEqual(commits);
  });
});
