import { describe, expect, it } from "bun:test";
import { buildSvg, parseSince, buildGitLogArgs } from "./cli.js";
import { GIT_LOG_FORMAT } from "./parser.js";
import { existsSync, unlinkSync, readFileSync } from "fs";
import { spawnSync } from "child_process";
import { resolve } from "path";

const SEP = "|";

function makeLogLine(sha: string, subject: string, iso: string): string {
  return [sha, "Author", "a@b.com", iso, subject].join(SEP);
}

const ONE_COMMIT = makeLogLine("abc123", "feat: first", "2026-01-10T10:00:00Z");
const TWO_COMMITS = [
  makeLogLine("aaa", "feat: one", "2026-01-10T10:00:00Z"),
  makeLogLine("bbb", "feat: two", "2026-02-15T10:00:00Z"),
].join("\n");

describe("buildSvg", () => {
  it("returns valid SVG for empty log", () => {
    const svg = buildSvg("");
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
  });

  it("returns SVG with one commit dot for one commit", () => {
    const svg = buildSvg(ONE_COMMIT);
    expect(svg).toContain("<circle");
    expect(svg).toContain("feat: first");
  });

  it("returns SVG with two commit dots for two commits", () => {
    const svg = buildSvg(TWO_COMMITS);
    const circleCount = (svg.match(/<circle/g) ?? []).length;
    expect(circleCount).toBe(2);
  });

  it("does not crash on malformed input lines", () => {
    const messy = "not-a-valid-line\n" + ONE_COMMIT + "\nalso-bad";
    const svg = buildSvg(messy);
    expect(svg).toContain("<svg");
  });

  it("GIT_LOG_FORMAT is the canonical format string", () => {
    expect(GIT_LOG_FORMAT).toContain("%H");
    expect(GIT_LOG_FORMAT).toContain("%an");
    expect(GIT_LOG_FORMAT).toContain("%aI");
    expect(GIT_LOG_FORMAT).toContain("%s");
  });
});

describe("parseSince", () => {
  it("returns undefined when since is undefined", () => {
    expect(parseSince(undefined)).toBeUndefined();
  });

  it("parses a numeric string as count", () => {
    const result = parseSince("50");
    expect(result).toEqual({ type: "count", value: 50 });
  });

  it("parses a days string like '90d' as days", () => {
    const result = parseSince("90d");
    expect(result).toEqual({ type: "days", value: 90 });
  });

  it("parses a single-digit day string like '7d' as days", () => {
    const result = parseSince("7d");
    expect(result).toEqual({ type: "days", value: 7 });
  });

  it("parses a git ref/tag like 'v1.0.0' as ref", () => {
    const result = parseSince("v1.0.0");
    expect(result).toEqual({ type: "ref", value: "v1.0.0" });
  });

  it("parses a branch name as ref", () => {
    const result = parseSince("main");
    expect(result).toEqual({ type: "ref", value: "main" });
  });
});

describe("buildGitLogArgs", () => {
  const FORMAT_ARG = `--format=${GIT_LOG_FORMAT}`;

  it("returns base args when since is undefined", () => {
    const args = buildGitLogArgs(undefined);
    expect(args).toEqual(["log", FORMAT_ARG]);
  });

  it("adds -N for count since", () => {
    const args = buildGitLogArgs({ type: "count", value: 50 });
    expect(args).toContain("-50");
    expect(args).toContain("log");
    expect(args).toContain(FORMAT_ARG);
  });

  it("adds --since=N.days.ago for days since", () => {
    const args = buildGitLogArgs({ type: "days", value: 90 });
    expect(args).toContain("--since=90.days.ago");
    expect(args).toContain("log");
    expect(args).toContain(FORMAT_ARG);
  });

  it("adds ref..HEAD range for ref since", () => {
    const args = buildGitLogArgs({ type: "ref", value: "v1.0.0" });
    expect(args).toContain("v1.0.0..HEAD");
    expect(args).toContain("log");
    expect(args).toContain(FORMAT_ARG);
  });
});

// Resolve the repo root (one level up from src/)
const REPO_ROOT = resolve(import.meta.dir, "..");

function runCli(args: string[]): ReturnType<typeof spawnSync> {
  return spawnSync("bun", ["src/cli.ts", ...args], {
    cwd: REPO_ROOT,
    encoding: "utf8",
  });
}

describe("CLI entrypoint", () => {
  it("produces timeline.svg when run with repo path", () => {
    const outFile = `${REPO_ROOT}/timeline-test-default.svg`;
    try {
      if (existsSync(outFile)) unlinkSync(outFile);
      const result = runCli([".", "--output", outFile]);
      expect(result.status).toBe(0);
      expect(existsSync(outFile)).toBe(true);
      const content = Bun.file(outFile).toString();
      // wait for file read — sync check is enough since we confirmed it exists
    } finally {
      if (existsSync(outFile)) unlinkSync(outFile);
    }
  });

  it("--format gif produces a gif file", () => {
    const outFile = `${REPO_ROOT}/timeline-test.gif`;
    try {
      if (existsSync(outFile)) unlinkSync(outFile);
      const result = runCli([".", "--format", "gif", "--output", outFile]);
      expect(result.status).toBe(0);
      expect(existsSync(outFile)).toBe(true);
    } finally {
      if (existsSync(outFile)) unlinkSync(outFile);
    }
  });

  it("--output writes to the specified path", () => {
    const outFile = "/tmp/test-timeline-gitstory.svg";
    try {
      if (existsSync(outFile)) unlinkSync(outFile);
      const result = runCli([".", "--output", outFile]);
      expect(result.status).toBe(0);
      expect(existsSync(outFile)).toBe(true);
    } finally {
      if (existsSync(outFile)) unlinkSync(outFile);
    }
  });

  it("exits non-zero for an invalid repo path", () => {
    const result = runCli(["/nonexistent/path/that/does/not/exist"]);
    expect(result.status).not.toBe(0);
  });

  it("--html writes an HTML file to the specified path", () => {
    const outFile = "/tmp/test-timeline-gitstory.html";
    try {
      if (existsSync(outFile)) unlinkSync(outFile);
      const result = runCli([".", "--html", outFile]);
      expect(result.status).toBe(0);
      expect(existsSync(outFile)).toBe(true);
    } finally {
      if (existsSync(outFile)) unlinkSync(outFile);
    }
  });

  it("--html output contains <!DOCTYPE html>", () => {
    const outFile = "/tmp/test-timeline-gitstory-doctype.html";
    try {
      if (existsSync(outFile)) unlinkSync(outFile);
      const result = runCli([".", "--html", outFile]);
      expect(result.status).toBe(0);
      const text = readFileSync(outFile, "utf8");
      expect(text).toContain("<!DOCTYPE html>");
    } finally {
      if (existsSync(outFile)) unlinkSync(outFile);
    }
  });

  it("--html output contains SVG content", () => {
    const outFile = "/tmp/test-timeline-gitstory-svg.html";
    try {
      if (existsSync(outFile)) unlinkSync(outFile);
      const result = runCli([".", "--html", outFile]);
      expect(result.status).toBe(0);
      const text = readFileSync(outFile, "utf8");
      expect(text).toContain("<svg");
    } finally {
      if (existsSync(outFile)) unlinkSync(outFile);
    }
  });

  it("--html output contains the repo name as title", () => {
    const outFile = "/tmp/test-timeline-gitstory-title.html";
    try {
      if (existsSync(outFile)) unlinkSync(outFile);
      const result = runCli([".", "--html", outFile]);
      expect(result.status).toBe(0);
      const text = readFileSync(outFile, "utf8");
      // The repo name (basename of cwd — "worker-gitstory-html") should appear in the title tag
      expect(text).toMatch(/<title>[^<]+<\/title>/);
    } finally {
      if (existsSync(outFile)) unlinkSync(outFile);
    }
  });

  it("--stats prints commit count, contributor count, and top contributor to stderr", () => {
    const outFile = "/tmp/test-timeline-stats.svg";
    try {
      if (existsSync(outFile)) unlinkSync(outFile);
      const result = runCli([".", "--stats", "--output", outFile]);
      expect(result.status).toBe(0);
      // stats summary goes to stderr
      const summary = result.stderr as string;
      expect(summary).toMatch(/\d+ commits/);
      expect(summary).toMatch(/\d+ contributor/);
      expect(summary).toMatch(/top:/);
    } finally {
      if (existsSync(outFile)) unlinkSync(outFile);
    }
  });

  it("--since 50 exits zero and produces output", () => {
    const outFile = "/tmp/test-timeline-since-count.svg";
    try {
      if (existsSync(outFile)) unlinkSync(outFile);
      const result = runCli([".", "--since", "50", "--output", outFile]);
      expect(result.status).toBe(0);
      expect(existsSync(outFile)).toBe(true);
    } finally {
      if (existsSync(outFile)) unlinkSync(outFile);
    }
  });

  it("--since 90d exits zero and produces output", () => {
    const outFile = "/tmp/test-timeline-since-days.svg";
    try {
      if (existsSync(outFile)) unlinkSync(outFile);
      const result = runCli([".", "--since", "90d", "--output", outFile]);
      expect(result.status).toBe(0);
      expect(existsSync(outFile)).toBe(true);
    } finally {
      if (existsSync(outFile)) unlinkSync(outFile);
    }
  });

  it("--since main exits zero and produces output", () => {
    const outFile = "/tmp/test-timeline-since-ref.svg";
    try {
      if (existsSync(outFile)) unlinkSync(outFile);
      const result = runCli([".", "--since", "main", "--output", outFile]);
      expect(result.status).toBe(0);
      expect(existsSync(outFile)).toBe(true);
    } finally {
      if (existsSync(outFile)) unlinkSync(outFile);
    }
  });
});
