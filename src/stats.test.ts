// src/stats.test.ts — TDD tests for git statistics module
import { test, expect, describe } from "bun:test";
import {
  totalCommits,
  dateRange,
  commitsByAuthor,
  commitFrequency,
  commitsByMonth,
} from "./stats";
import type { CommitRecord } from "./stats";

// --- fixtures ---

const makeCommit = (
  hash: string,
  author: string,
  date: Date,
  message = "some commit"
): CommitRecord => ({ hash, author, date, message });

const d = (iso: string) => new Date(iso);

const RECORDS: CommitRecord[] = [
  makeCommit("aaa", "alice", d("2024-01-01T10:00:00Z"), "init"),
  makeCommit("bbb", "bob",   d("2024-01-03T12:00:00Z"), "feat: foo"),
  makeCommit("ccc", "alice", d("2024-01-05T08:00:00Z"), "fix: bar"),
  makeCommit("ddd", "alice", d("2024-01-07T18:00:00Z"), "refactor"),
  makeCommit("eee", "bob",   d("2024-01-11T09:00:00Z"), "docs"),
];

// --- totalCommits ---

describe("totalCommits", () => {
  test("returns correct count for normal input", () => {
    expect(totalCommits(RECORDS)).toBe(5);
  });

  test("returns 0 for empty array", () => {
    expect(totalCommits([])).toBe(0);
  });

  test("returns 1 for single commit", () => {
    expect(totalCommits([RECORDS[0]])).toBe(1);
  });
});

// --- dateRange ---

describe("dateRange", () => {
  test("returns first, last, and days for normal input", () => {
    const range = dateRange(RECORDS);
    expect(range).not.toBeNull();
    expect(range!.first).toEqual(d("2024-01-01T10:00:00Z"));
    expect(range!.last).toEqual(d("2024-01-11T09:00:00Z"));
    // 10 full days between Jan 1 and Jan 11
    expect(range!.days).toBe(10);
  });

  test("returns null for empty array", () => {
    expect(dateRange([])).toBeNull();
  });

  test("returns days=0 for single commit", () => {
    const range = dateRange([RECORDS[0]]);
    expect(range).not.toBeNull();
    expect(range!.first).toEqual(RECORDS[0].date);
    expect(range!.last).toEqual(RECORDS[0].date);
    expect(range!.days).toBe(0);
  });
});

// --- commitsByAuthor ---

describe("commitsByAuthor", () => {
  test("returns entries sorted by count descending", () => {
    const result = commitsByAuthor(RECORDS);
    expect(result[0]).toEqual({ author: "alice", count: 3 });
    expect(result[1]).toEqual({ author: "bob", count: 2 });
  });

  test("returns empty array for empty input", () => {
    expect(commitsByAuthor([])).toEqual([]);
  });

  test("returns single entry for single commit", () => {
    const result = commitsByAuthor([RECORDS[0]]);
    expect(result).toEqual([{ author: "alice", count: 1 }]);
  });
});

// --- commitsByMonth ---

describe("commitsByMonth", () => {
  test("returns empty array for empty input", () => {
    expect(commitsByMonth([])).toEqual([]);
  });

  test("returns single month entry for commits in one month", () => {
    const records: CommitRecord[] = [
      makeCommit("a1", "alice", d("2024-03-05T10:00:00Z")),
      makeCommit("a2", "alice", d("2024-03-15T10:00:00Z")),
      makeCommit("a3", "bob",   d("2024-03-20T10:00:00Z")),
    ];
    const result = commitsByMonth(records);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ month: "2024-03", count: 3, topAuthor: "alice" });
  });

  test("sorts months newest-first", () => {
    const records: CommitRecord[] = [
      makeCommit("a1", "alice", d("2024-01-10T10:00:00Z")),
      makeCommit("a2", "bob",   d("2024-03-10T10:00:00Z")),
      makeCommit("a3", "carol", d("2024-02-10T10:00:00Z")),
    ];
    const result = commitsByMonth(records);
    expect(result.map((r) => r.month)).toEqual(["2024-03", "2024-02", "2024-01"]);
  });

  test("identifies top author per month correctly", () => {
    const records: CommitRecord[] = [
      makeCommit("a1", "alice", d("2024-05-01T10:00:00Z")),
      makeCommit("a2", "alice", d("2024-05-02T10:00:00Z")),
      makeCommit("a3", "bob",   d("2024-05-03T10:00:00Z")),
      makeCommit("b1", "bob",   d("2024-06-01T10:00:00Z")),
      makeCommit("b2", "bob",   d("2024-06-02T10:00:00Z")),
      makeCommit("b3", "alice", d("2024-06-03T10:00:00Z")),
    ];
    const result = commitsByMonth(records);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ month: "2024-06", count: 3, topAuthor: "bob" });
    expect(result[1]).toEqual({ month: "2024-05", count: 3, topAuthor: "alice" });
  });

  test("tie in top author resolved alphabetically (first name wins)", () => {
    const records: CommitRecord[] = [
      makeCommit("a1", "zara", d("2024-07-01T10:00:00Z")),
      makeCommit("a2", "alice", d("2024-07-02T10:00:00Z")),
    ];
    const result = commitsByMonth(records);
    expect(result).toHaveLength(1);
    // "alice" < "zara" alphabetically → alice wins tie
    expect(result[0].topAuthor).toBe("alice");
  });

  test("handles commits spanning many months with correct counts", () => {
    const records: CommitRecord[] = [
      makeCommit("a1", "alice", d("2023-11-01T10:00:00Z")),
      makeCommit("a2", "alice", d("2023-11-15T10:00:00Z")),
      makeCommit("a3", "alice", d("2023-12-01T10:00:00Z")),
      makeCommit("a4", "bob",   d("2024-01-01T10:00:00Z")),
      makeCommit("a5", "bob",   d("2024-01-02T10:00:00Z")),
      makeCommit("a6", "carol", d("2024-01-03T10:00:00Z")),
    ];
    const result = commitsByMonth(records);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ month: "2024-01", count: 3, topAuthor: "bob" });
    expect(result[1]).toEqual({ month: "2023-12", count: 1, topAuthor: "alice" });
    expect(result[2]).toEqual({ month: "2023-11", count: 2, topAuthor: "alice" });
  });

  test("truncates author names longer than 20 chars", () => {
    const records: CommitRecord[] = [
      makeCommit("a1", "averylongauthornamehere", d("2024-08-01T10:00:00Z")),
    ];
    const result = commitsByMonth(records);
    expect(result[0].topAuthor.length).toBeLessThanOrEqual(20);
    expect(result[0].topAuthor).toBe("averylongauthornameh");
  });
});

// --- commitFrequency ---

describe("commitFrequency", () => {
  test("returns average commits per day for normal input", () => {
    // 5 commits over 10 days = 0.5
    const freq = commitFrequency(RECORDS);
    expect(freq).toBeCloseTo(0.5, 5);
  });

  test("returns 0 for empty array", () => {
    expect(commitFrequency([])).toBe(0);
  });

  test("returns 0 for single commit (0 days span)", () => {
    expect(commitFrequency([RECORDS[0]])).toBe(0);
  });
});
