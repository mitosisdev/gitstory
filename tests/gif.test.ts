import { describe, expect, it } from "bun:test";
import { renderGif, buildAuthorColorMap } from "../src/gif.js";
import { buildGif } from "../src/cli.js";
import type { Commit } from "../src/parser.js";

const SEP = "|";

function makeLogLine(sha: string, subject: string, iso: string, author = "Author"): string {
  return [sha, author, "a@b.com", iso, subject].join(SEP);
}

function makeCommit(sha: string, authorName: string): Commit {
  return {
    sha,
    authorName,
    authorEmail: "test@example.com",
    isoTimestamp: "2026-01-01T00:00:00Z",
    subject: "test commit",
  };
}

const ZERO_COMMITS = "";
const ONE_COMMIT = makeLogLine("abc123", "feat: first", "2026-01-10T10:00:00Z");
const MULTI_COMMITS = [
  makeLogLine("aaa", "feat: one", "2026-01-10T10:00:00Z"),
  makeLogLine("bbb", "feat: two", "2026-02-15T10:00:00Z"),
  makeLogLine("ccc", "feat: three", "2026-03-20T10:00:00Z"),
].join("\n");

const MULTI_AUTHOR_COMMITS = [
  makeLogLine("aaa", "feat: one", "2026-01-10T10:00:00Z", "Alice"),
  makeLogLine("bbb", "feat: two", "2026-02-15T10:00:00Z", "Bob"),
  makeLogLine("ccc", "feat: three", "2026-03-20T10:00:00Z", "Alice"),
].join("\n");

describe("buildAuthorColorMap", () => {
  it("returns first palette color for single author", () => {
    const commits = [makeCommit("abc", "Alice")];
    const map = buildAuthorColorMap(commits);
    expect(map.size).toBe(1);
    // First palette color is the original purple
    expect(map.get("Alice")).toEqual([0x8a, 0x2b, 0xe2]);
  });

  it("assigns different colors to two distinct authors", () => {
    const commits = [makeCommit("a1", "Alice"), makeCommit("b1", "Bob")];
    const map = buildAuthorColorMap(commits);
    expect(map.size).toBe(2);
    const aliceColor = map.get("Alice");
    const bobColor = map.get("Bob");
    expect(aliceColor).toBeDefined();
    expect(bobColor).toBeDefined();
    // They should be different colors
    expect(aliceColor).not.toEqual(bobColor);
  });

  it("same author across multiple commits gets one entry", () => {
    const commits = [
      makeCommit("a1", "Alice"),
      makeCommit("a2", "Alice"),
      makeCommit("a3", "Alice"),
    ];
    const map = buildAuthorColorMap(commits);
    expect(map.size).toBe(1);
  });

  it("returns empty map for empty commits", () => {
    const map = buildAuthorColorMap([]);
    expect(map.size).toBe(0);
  });

  it("wraps palette for more authors than palette length", () => {
    const authors = ["A", "B", "C", "D", "E", "F", "G"];
    const commits = authors.map((a, i) => makeCommit(`sha${i}`, a));
    const map = buildAuthorColorMap(commits);
    expect(map.size).toBe(7);
    // First and 7th author should have same color (palette wraps at 6)
    expect(map.get("A")).toEqual(map.get("G"));
  });
});

describe("renderGif", () => {
  it("returns a non-empty Buffer for zero commits", () => {
    const buf = renderGif([]);
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.length).toBeGreaterThan(0);
  });

  it("returns a Buffer for one commit", async () => {
    const { parseGitLog } = await import("../src/parser.js");
    const commits = parseGitLog(ONE_COMMIT);
    const buf = renderGif(commits);
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.length).toBeGreaterThan(0);
  });

  it("returns a Buffer for multiple commits", async () => {
    const { parseGitLog } = await import("../src/parser.js");
    const commits = parseGitLog(MULTI_COMMITS);
    const buf = renderGif(commits);
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.length).toBeGreaterThan(0);
  });

  it("returns a Buffer for multiple authors", async () => {
    const { parseGitLog } = await import("../src/parser.js");
    const commits = parseGitLog(MULTI_AUTHOR_COMMITS);
    const buf = renderGif(commits);
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.length).toBeGreaterThan(0);
  });
});

describe("buildGif", () => {
  it("returns a non-empty Buffer for empty log", () => {
    const buf = buildGif(ZERO_COMMITS);
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.length).toBeGreaterThan(0);
  });

  it("returns a Buffer for one commit log line", () => {
    const buf = buildGif(ONE_COMMIT);
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.length).toBeGreaterThan(0);
  });

  it("returns a Buffer for multiple commit log lines", () => {
    const buf = buildGif(MULTI_COMMITS);
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.length).toBeGreaterThan(0);
  });
});
