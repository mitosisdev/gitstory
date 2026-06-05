import { describe, expect, it } from "bun:test";
import { buildSvg } from "./cli.js";
import { GIT_LOG_FORMAT } from "./parser.js";
import { existsSync, unlinkSync } from "fs";
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
});
