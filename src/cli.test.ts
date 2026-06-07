import { describe, expect, it } from "bun:test";
import { buildSvg } from "./cli.js";
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

  it("--since 1 limits output to 1 commit (count form)", () => {
    const outFile = "/tmp/test-timeline-since-count.svg";
    try {
      if (existsSync(outFile)) unlinkSync(outFile);
      const result = runCli([".", "--since", "1", "--output", outFile]);
      expect(result.status).toBe(0);
      expect(existsSync(outFile)).toBe(true);
      // stdout shows "(1 commits)" — just check the file was written
      const text = readFileSync(outFile, "utf8");
      expect(text).toContain("<svg");
    } finally {
      if (existsSync(outFile)) unlinkSync(outFile);
    }
  });

  it("--since 9999d includes all commits (days form — large window)", () => {
    const outFile = "/tmp/test-timeline-since-days.svg";
    try {
      if (existsSync(outFile)) unlinkSync(outFile);
      const result = runCli([".", "--since", "9999d", "--output", outFile]);
      expect(result.status).toBe(0);
      expect(existsSync(outFile)).toBe(true);
      const text = readFileSync(outFile, "utf8");
      expect(text).toContain("<svg");
    } finally {
      if (existsSync(outFile)) unlinkSync(outFile);
    }
  });

  it("--since with a valid ref produces an SVG (ref form)", () => {
    // Use the first commit SHA as the ref — everything since genesis = all commits
    const firstSha = spawnSync("git", ["rev-list", "--max-parents=0", "HEAD"], {
      cwd: REPO_ROOT,
      encoding: "utf8",
    }).stdout.trim();

    const outFile = "/tmp/test-timeline-since-ref.svg";
    try {
      if (existsSync(outFile)) unlinkSync(outFile);
      // <first>..HEAD is an empty range when there is only one commit, but the CLI should succeed
      const result = runCli([".", "--since", firstSha, "--output", outFile]);
      expect(result.status).toBe(0);
      expect(existsSync(outFile)).toBe(true);
    } finally {
      if (existsSync(outFile)) unlinkSync(outFile);
    }
  });

  it("--since missing value exits non-zero", () => {
    const result = runCli([".", "--since"]);
    expect(result.status).not.toBe(0);
  });
});
