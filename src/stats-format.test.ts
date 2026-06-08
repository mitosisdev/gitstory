// src/stats-format.test.ts — TDD tests for the CLI stats formatter
import { test, expect, describe } from "bun:test";
import { formatStats } from "./stats-format";
import type { CommitRecord } from "./stats";

const makeCommit = (
  hash: string,
  author: string,
  date: Date,
  message = "some commit"
): CommitRecord => ({ hash, author, date, message });

const d = (iso: string) => new Date(iso);

// Spread across three months so the per-month table has multiple rows.
const RECORDS: CommitRecord[] = [
  makeCommit("a1", "alice", d("2026-06-01T10:00:00Z"), "init"),
  makeCommit("a2", "alice", d("2026-06-10T10:00:00Z"), "feat"),
  makeCommit("b1", "bob", d("2026-05-02T10:00:00Z"), "fix"),
  makeCommit("b2", "bob", d("2026-05-09T10:00:00Z"), "docs"),
  makeCommit("b3", "bob", d("2026-05-15T10:00:00Z"), "refactor"),
  makeCommit("c1", "alice", d("2026-04-20T10:00:00Z"), "chore"),
];

describe("formatStats", () => {
  test("includes the summary line with totals, contributors and top author", () => {
    const out = formatStats(RECORDS);
    expect(out).toContain("6 commits");
    expect(out).toContain("2 contributors");
    // bob has 3, alice has 3 — top is whoever commitsByAuthor sorts first; just assert top: present
    expect(out).toContain("top:");
  });

  test("includes a per-month table header with Month, Commits and Top Author columns", () => {
    const out = formatStats(RECORDS);
    expect(out).toContain("Month");
    expect(out).toContain("Commits");
    expect(out).toContain("Top Author");
    // divider row of dashes
    expect(out).toMatch(/-{5,}/);
  });

  test("renders one row per month, newest-first", () => {
    const out = formatStats(RECORDS);
    const lines = out.split("\n");
    const junIdx = lines.findIndex((l) => l.startsWith("2026-06"));
    const mayIdx = lines.findIndex((l) => l.startsWith("2026-05"));
    const aprIdx = lines.findIndex((l) => l.startsWith("2026-04"));
    expect(junIdx).toBeGreaterThan(-1);
    expect(mayIdx).toBeGreaterThan(-1);
    expect(aprIdx).toBeGreaterThan(-1);
    // newest-first ordering
    expect(junIdx).toBeLessThan(mayIdx);
    expect(mayIdx).toBeLessThan(aprIdx);
  });

  test("each month row shows the correct commit count and top author", () => {
    const out = formatStats(RECORDS);
    const lines = out.split("\n");
    const jun = lines.find((l) => l.startsWith("2026-06"))!;
    const may = lines.find((l) => l.startsWith("2026-05"))!;
    const apr = lines.find((l) => l.startsWith("2026-04"))!;
    // June: 2 commits, alice top
    expect(jun).toContain("2");
    expect(jun).toContain("alice");
    // May: 3 commits, bob top
    expect(may).toContain("3");
    expect(may).toContain("bob");
    // April: 1 commit, alice top
    expect(apr).toContain("1");
    expect(apr).toContain("alice");
  });

  test("columns are aligned — month rows share the same column offsets as the header", () => {
    const out = formatStats(RECORDS);
    const lines = out.split("\n");
    const header = lines.find((l) => l.includes("Top Author"))!;
    const authorCol = header.indexOf("Top Author");
    const jun = lines.find((l) => l.startsWith("2026-06"))!;
    // The author name in the data row should begin at the same column as the header label.
    expect(jun.indexOf("alice")).toBe(authorCol);
  });

  test("returns just the summary (no table) for empty input", () => {
    const out = formatStats([]);
    expect(out).toContain("0 commits");
    expect(out).not.toContain("Top Author");
  });

  test("uses singular 'contributor' for a single author", () => {
    const out = formatStats([makeCommit("z", "solo", d("2026-06-01T10:00:00Z"))]);
    expect(out).toContain("1 contributor ");
  });
});
