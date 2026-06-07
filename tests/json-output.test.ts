// tests/json-output.test.ts — TDD for --json output flag
import { describe, it, expect } from "bun:test";
import { parseGitLog } from "../src/parser.js";
import { commitsToJson, type JsonCommit } from "../src/cli.js";

// Helper to build a raw git log line in the pipe-delimited format gitstory expects
const SEP = "|";
function makeLogLine(
  sha: string,
  author: string,
  email: string,
  iso: string,
  subject: string
): string {
  return [sha, author, email, iso, subject].join(SEP);
}

const FEAT_LINE = makeLogLine(
  "abc1234abcdef",
  "Jane Doe",
  "jane@example.com",
  "2026-05-01T10:00:00Z",
  "feat: add user authentication"
);

const BREAKING_LINE = makeLogLine(
  "def5678defghi",
  "Bob",
  "bob@example.com",
  "2026-04-20T09:00:00Z",
  "feat!: redesign API"
);

const SCOPED_LINE = makeLogLine(
  "bbb2222bbbbbb",
  "Alice",
  "alice@example.com",
  "2026-03-10T08:00:00Z",
  "fix(auth): correct token expiry"
);

const PLAIN_LINE = makeLogLine(
  "ccc3333cccccc",
  "Charlie",
  "charlie@example.com",
  "2026-02-01T07:00:00Z",
  "update readme"
);

describe("commitsToJson", () => {
  it("returns an array", () => {
    const commits = parseGitLog(FEAT_LINE);
    const result = commitsToJson(commits);
    expect(Array.isArray(result)).toBe(true);
  });

  it("produces one object per commit", () => {
    const log = [FEAT_LINE, SCOPED_LINE, PLAIN_LINE].join("\n");
    const commits = parseGitLog(log);
    const result = commitsToJson(commits);
    expect(result).toHaveLength(3);
  });

  it("maps hash and shortHash correctly", () => {
    const commits = parseGitLog(FEAT_LINE);
    const [c] = commitsToJson(commits);
    expect(c.hash).toBe("abc1234abcdef");
    expect(c.shortHash).toBe("abc1234");
  });

  it("maps author and email", () => {
    const commits = parseGitLog(FEAT_LINE);
    const [c] = commitsToJson(commits);
    expect(c.author).toBe("Jane Doe");
    expect(c.email).toBe("jane@example.com");
  });

  it("maps date as ISO timestamp", () => {
    const commits = parseGitLog(FEAT_LINE);
    const [c] = commitsToJson(commits);
    expect(c.date).toBe("2026-05-01T10:00:00Z");
  });

  it("maps message as full subject", () => {
    const commits = parseGitLog(FEAT_LINE);
    const [c] = commitsToJson(commits);
    expect(c.message).toBe("feat: add user authentication");
  });

  it("parses conventional commit type", () => {
    const commits = parseGitLog(FEAT_LINE);
    const [c] = commitsToJson(commits);
    expect(c.type).toBe("feat");
  });

  it("parses scope when present", () => {
    const commits = parseGitLog(SCOPED_LINE);
    const [c] = commitsToJson(commits);
    expect(c.scope).toBe("auth");
  });

  it("sets scope to null when absent", () => {
    const commits = parseGitLog(FEAT_LINE);
    const [c] = commitsToJson(commits);
    expect(c.scope).toBeNull();
  });

  it("detects breaking change via ! suffix", () => {
    const commits = parseGitLog(BREAKING_LINE);
    const [c] = commitsToJson(commits);
    expect(c.breaking).toBe(true);
  });

  it("sets breaking to false for normal commits", () => {
    const commits = parseGitLog(FEAT_LINE);
    const [c] = commitsToJson(commits);
    expect(c.breaking).toBe(false);
  });

  it("sets type to null for non-conventional commits", () => {
    const commits = parseGitLog(PLAIN_LINE);
    const [c] = commitsToJson(commits);
    expect(c.type).toBeNull();
  });

  it("produces valid JSON when serialized", () => {
    const commits = parseGitLog(FEAT_LINE);
    const result = commitsToJson(commits);
    const serialized = JSON.stringify(result);
    expect(() => JSON.parse(serialized)).not.toThrow();
    const parsed = JSON.parse(serialized);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed[0]).toHaveProperty("hash");
    expect(parsed[0]).toHaveProperty("shortHash");
    expect(parsed[0]).toHaveProperty("author");
    expect(parsed[0]).toHaveProperty("email");
    expect(parsed[0]).toHaveProperty("date");
    expect(parsed[0]).toHaveProperty("message");
    expect(parsed[0]).toHaveProperty("type");
    expect(parsed[0]).toHaveProperty("scope");
    expect(parsed[0]).toHaveProperty("breaking");
  });

  it("handles empty commit list", () => {
    const result = commitsToJson([]);
    expect(result).toEqual([]);
  });
});
