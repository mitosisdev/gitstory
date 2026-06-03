// src/stats.test.ts — TDD tests for git statistics module
import { test, expect, describe } from "bun:test";
import {
  totalCommits,
  dateRange,
  commitsByAuthor,
  commitFrequency,
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
