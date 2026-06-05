import { describe, expect, it } from "bun:test";
import { renderGif } from "../src/gif.js";
import { buildGif } from "../src/cli.js";

const SEP = "|";

function makeLogLine(sha: string, subject: string, iso: string): string {
  return [sha, "Author", "a@b.com", iso, subject].join(SEP);
}

const ZERO_COMMITS = "";
const ONE_COMMIT = makeLogLine("abc123", "feat: first", "2026-01-10T10:00:00Z");
const MULTI_COMMITS = [
  makeLogLine("aaa", "feat: one", "2026-01-10T10:00:00Z"),
  makeLogLine("bbb", "feat: two", "2026-02-15T10:00:00Z"),
  makeLogLine("ccc", "feat: three", "2026-03-20T10:00:00Z"),
].join("\n");

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
