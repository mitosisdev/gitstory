import { describe, expect, it } from "bun:test";
import { spawnSync } from "child_process";
import { existsSync, unlinkSync } from "fs";
import { resolve } from "path";

const REPO_ROOT = resolve(import.meta.dir, "..");

function runCli(args: string[]): ReturnType<typeof spawnSync> {
  return spawnSync("bun", ["src/cli.ts", ...args], {
    cwd: REPO_ROOT,
    encoding: "utf8",
  });
}

describe("--branch flag", () => {
  it("--branch main produces a valid SVG (using this repo as fixture)", () => {
    const outFile = "/tmp/test-branch-main.svg";
    try {
      if (existsSync(outFile)) unlinkSync(outFile);
      const result = runCli([".", "--branch", "main", "--output", outFile]);
      expect(result.status).toBe(0);
      expect(existsSync(outFile)).toBe(true);
    } finally {
      if (existsSync(outFile)) unlinkSync(outFile);
    }
  });

  it("--branch main output contains <svg>", () => {
    const outFile = "/tmp/test-branch-main-svg.svg";
    try {
      if (existsSync(outFile)) unlinkSync(outFile);
      const result = runCli([".", "--branch", "main", "--output", outFile]);
      expect(result.status).toBe(0);
      const text = require("fs").readFileSync(outFile, "utf8");
      expect(text).toContain("<svg");
    } finally {
      if (existsSync(outFile)) unlinkSync(outFile);
    }
  });

  it("without --branch flag, default behavior is unchanged (all commits)", () => {
    const outFile = "/tmp/test-no-branch.svg";
    try {
      if (existsSync(outFile)) unlinkSync(outFile);
      const result = runCli([".", "--output", outFile]);
      expect(result.status).toBe(0);
      expect(existsSync(outFile)).toBe(true);
    } finally {
      if (existsSync(outFile)) unlinkSync(outFile);
    }
  });

  it("--branch with a nonexistent branch exits non-zero", () => {
    const result = runCli([".", "--branch", "this-branch-does-not-exist-at-all-xyz"]);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("branch");
  });

  it("--branch missing value exits non-zero", () => {
    const result = runCli([".", "--branch"]);
    expect(result.status).not.toBe(0);
  });

  it("--branch scopes commits to that branch (commit count matches direct git log)", () => {
    // Get commit count for main via direct git log
    const gitResult = spawnSync("git", ["log", "main", "--oneline"], {
      cwd: REPO_ROOT,
      encoding: "utf8",
    });
    if (gitResult.status !== 0) {
      // If main doesn't exist, skip this test gracefully
      return;
    }
    const directCount = gitResult.stdout.trim().split("\n").filter(Boolean).length;

    const outFile = "/tmp/test-branch-scope.svg";
    try {
      if (existsSync(outFile)) unlinkSync(outFile);
      const result = runCli([".", "--branch", "main", "--output", outFile]);
      expect(result.status).toBe(0);
      // stdout: "wrote <file> (<N> commits)"
      const match = /\((\d+) commits\)/.exec(result.stdout as string);
      expect(match).not.toBeNull();
      const cliCount = parseInt(match![1]!, 10);
      expect(cliCount).toBe(directCount);
    } finally {
      if (existsSync(outFile)) unlinkSync(outFile);
    }
  });

  it("--branch works together with --stats", () => {
    const outFile = "/tmp/test-branch-stats.svg";
    try {
      if (existsSync(outFile)) unlinkSync(outFile);
      const result = runCli([".", "--branch", "main", "--stats", "--output", outFile]);
      expect(result.status).toBe(0);
      expect(result.stderr).toMatch(/\d+ commits/);
    } finally {
      if (existsSync(outFile)) unlinkSync(outFile);
    }
  });
});
