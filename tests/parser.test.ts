import { test, expect } from "bun:test";
import { parseGitLog, GIT_LOG_FORMAT } from "../src/parser";

const SEP = "|";

function makeLine(sha: string, name: string, email: string, ts: string, subject: string): string {
  return [sha, name, email, ts, subject].join(SEP);
}

const SHA1 = "a".repeat(40);
const SHA2 = "b".repeat(40);

test("returns empty array for empty string", () => {
  expect(parseGitLog("")).toEqual([]);
});

test("returns empty array for whitespace-only string", () => {
  expect(parseGitLog("   \n  \n")).toEqual([]);
});

test("returns empty array for lines that lack enough fields", () => {
  expect(parseGitLog("incomplete line")).toEqual([]);
  expect(parseGitLog(`${SHA1}${SEP}Name Only`)).toEqual([]);
});

test("parses a single commit correctly", () => {
  const line = makeLine(SHA1, "Alice Smith", "alice@example.com", "2026-06-01T10:00:00+00:00", "Initial commit");
  const result = parseGitLog(line);
  expect(result).toHaveLength(1);
  expect(result[0]).toEqual({
    sha: SHA1,
    authorName: "Alice Smith",
    authorEmail: "alice@example.com",
    isoTimestamp: "2026-06-01T10:00:00+00:00",
    subject: "Initial commit",
  });
});

test("parses multiple commits in order", () => {
  const log = [
    makeLine(SHA1, "Alice", "alice@x.com", "2026-06-01T10:00:00+00:00", "first"),
    makeLine(SHA2, "Bob", "bob@x.com", "2026-06-02T10:00:00+00:00", "second"),
  ].join("\n");

  const result = parseGitLog(log);
  expect(result).toHaveLength(2);
  expect(result[0]?.sha).toBe(SHA1);
  expect(result[1]?.sha).toBe(SHA2);
});

test("skips blank lines without failing", () => {
  const log = [
    makeLine(SHA1, "Alice", "a@x.com", "2026-06-01T00:00:00+00:00", "first"),
    "",
    makeLine(SHA2, "Bob", "b@x.com", "2026-06-02T00:00:00+00:00", "second"),
    "",
  ].join("\n");

  const result = parseGitLog(log);
  expect(result).toHaveLength(2);
});

test("preserves full 40-char SHA", () => {
  const line = makeLine(SHA1, "Dev", "dev@x.com", "2026-06-01T00:00:00+00:00", "msg");
  expect(parseGitLog(line)[0]?.sha).toBe(SHA1);
  expect(parseGitLog(line)[0]?.sha).toHaveLength(40);
});

test("GIT_LOG_FORMAT export is a non-empty string", () => {
  expect(typeof GIT_LOG_FORMAT).toBe("string");
  expect(GIT_LOG_FORMAT.length).toBeGreaterThan(0);
});

test("GIT_LOG_FORMAT contains the expected git format placeholders", () => {
  expect(GIT_LOG_FORMAT).toContain("%H");
  expect(GIT_LOG_FORMAT).toContain("%an");
  expect(GIT_LOG_FORMAT).toContain("%ae");
  expect(GIT_LOG_FORMAT).toContain("%aI");
  expect(GIT_LOG_FORMAT).toContain("%s");
});
