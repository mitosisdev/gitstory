import { describe, expect, it } from "bun:test";
import { parseGitLog } from "./parser.js";

// Fixture: output of `git log --format="%H|%an|%ae|%aI|%s"` (pipe-delimited)
const FIXTURE_3 = [
  "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2|Alice Smith|alice@example.com|2026-01-10T10:00:00+00:00|feat: initial commit",
  "b2c3d4e5f6b2c3d4e5f6b2c3d4e5f6b2c3d4e5f6|Bob Jones|bob@example.com|2026-02-15T12:30:00+00:00|fix: correct off-by-one error",
  "c3d4e5f6c3d4e5f6c3d4e5f6c3d4e5f6c3d4e5f6|Carol Dev|carol@example.com|2026-03-20T09:15:00+00:00|chore: update dependencies",
].join("\n");

describe("parseGitLog", () => {
  it("parses 3 commits from fixture log correctly", () => {
    const result = parseGitLog(FIXTURE_3);
    expect(result).toHaveLength(3);

    expect(result[0]).toEqual({
      sha: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
      authorName: "Alice Smith",
      authorEmail: "alice@example.com",
      isoTimestamp: "2026-01-10T10:00:00+00:00",
      subject: "feat: initial commit",
    });

    expect(result[1]).toEqual({
      sha: "b2c3d4e5f6b2c3d4e5f6b2c3d4e5f6b2c3d4e5f6",
      authorName: "Bob Jones",
      authorEmail: "bob@example.com",
      isoTimestamp: "2026-02-15T12:30:00+00:00",
      subject: "fix: correct off-by-one error",
    });

    expect(result[2]).toEqual({
      sha: "c3d4e5f6c3d4e5f6c3d4e5f6c3d4e5f6c3d4e5f6",
      authorName: "Carol Dev",
      authorEmail: "carol@example.com",
      isoTimestamp: "2026-03-20T09:15:00+00:00",
      subject: "chore: update dependencies",
    });
  });

  it("returns empty array for empty string", () => {
    expect(parseGitLog("")).toEqual([]);
  });

  it("returns empty array for whitespace-only string", () => {
    expect(parseGitLog("   \n  \n  ")).toEqual([]);
  });

  it("parses single commit to single-element array", () => {
    const line =
      "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2|Alice Smith|alice@example.com|2026-01-10T10:00:00+00:00|feat: initial commit";
    const result = parseGitLog(line);
    expect(result).toHaveLength(1);
    expect(result[0]?.sha).toBe("a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2");
    expect(result[0]?.subject).toBe("feat: initial commit");
  });

  it("skips blank lines gracefully", () => {
    const log = [
      "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2|Alice Smith|alice@example.com|2026-01-10T10:00:00+00:00|first",
      "",
      "b2c3d4e5f6b2c3d4e5f6b2c3d4e5f6b2c3d4e5f6|Bob Jones|bob@example.com|2026-02-15T12:30:00+00:00|second",
      "",
    ].join("\n");

    const result = parseGitLog(log);
    expect(result).toHaveLength(2);
    expect(result[0]?.sha).toBe("a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2");
    expect(result[1]?.sha).toBe("b2c3d4e5f6b2c3d4e5f6b2c3d4e5f6b2c3d4e5f6");
  });
});
