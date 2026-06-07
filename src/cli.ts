#!/usr/bin/env bun
import { parseGitLog, GIT_LOG_FORMAT } from "./parser.js";
import { renderTimeline } from "./renderer.js";
import { renderGif } from "./gif.js";
import { wrapSvgInHtml } from "./html.js";
import { totalCommits, commitsByAuthor } from "./stats.js";
import { spawnSync } from "child_process";
import { resolve, basename } from "path";

export function buildSvg(logInput: string, repoName?: string): string {
  const commits = parseGitLog(logInput);
  return renderTimeline(commits, repoName);
}

export function buildGif(logInput: string): Buffer {
  const commits = parseGitLog(logInput);
  return renderGif(commits);
}

export type SinceParsed =
  | { type: "count"; value: number }
  | { type: "days"; value: number }
  | { type: "ref"; value: string };

/**
 * Parse the --since argument value into a typed descriptor.
 *
 * Rules:
 *   "50"     → { type: "count", value: 50 }   (pure integer string)
 *   "90d"    → { type: "days",  value: 90 }   (integer followed by 'd')
 *   "v1.0.0" → { type: "ref",   value: "v1.0.0" } (any other string)
 */
export function parseSince(raw: string | undefined): SinceParsed | undefined {
  if (raw === undefined) return undefined;

  // Pure integer → count limit
  if (/^\d+$/.test(raw)) {
    return { type: "count", value: parseInt(raw, 10) };
  }

  // Integer followed by 'd' → day range
  const daysMatch = raw.match(/^(\d+)d$/);
  if (daysMatch) {
    return { type: "days", value: parseInt(daysMatch[1], 10) };
  }

  // Anything else → treat as a git ref
  return { type: "ref", value: raw };
}

/**
 * Build the git log argument array for spawnSync, incorporating --since filtering.
 */
export function buildGitLogArgs(since: SinceParsed | undefined): string[] {
  const formatArg = `--format=${GIT_LOG_FORMAT}`;

  if (since === undefined) {
    return ["log", formatArg];
  }

  if (since.type === "count") {
    return ["log", `-${since.value}`, formatArg];
  }

  if (since.type === "days") {
    return ["log", `--since=${since.value}.days.ago`, formatArg];
  }

  // ref: use <ref>..HEAD range
  return ["log", `${since.value}..HEAD`, formatArg];
}

if (import.meta.main) {
  const args = process.argv.slice(2);

  // Parse arguments
  let repoPath = ".";
  let format: "svg" | "gif" = "svg";
  let output: string | null = null;
  let htmlOutput: string | null = null;
  let showStats = false;
  let sinceRaw: string | undefined = undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--format") {
      const val = args[++i];
      if (val !== "svg" && val !== "gif") {
        console.error(`error: --format must be svg or gif, got "${val}"`);
        process.exit(1);
      }
      format = val;
    } else if (arg === "--output") {
      output = args[++i] ?? null;
      if (!output) {
        console.error("error: --output requires a file path");
        process.exit(1);
      }
    } else if (arg === "--html") {
      htmlOutput = args[++i] ?? null;
      if (!htmlOutput) {
        console.error("error: --html requires a file path");
        process.exit(1);
      }
    } else if (arg === "--stats") {
      showStats = true;
    } else if (arg === "--since") {
      sinceRaw = args[++i];
      if (!sinceRaw) {
        console.error("error: --since requires a value (count, days like 90d, or a git ref)");
        process.exit(1);
      }
    } else if (!arg.startsWith("--")) {
      repoPath = arg;
    } else {
      console.error(`error: unknown flag ${arg}`);
      process.exit(1);
    }
  }

  const absRepoPath = resolve(repoPath);
  const repoName = basename(absRepoPath);
  const since = parseSince(sinceRaw);

  // Run git log
  const result = spawnSync(
    "git",
    buildGitLogArgs(since),
    { cwd: absRepoPath, encoding: "utf8" }
  );

  if (result.error) {
    console.error(`error: failed to run git: ${result.error.message}`);
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(`error: git log failed (is "${absRepoPath}" a git repo?)`);
    if (result.stderr) console.error(result.stderr.trim());
    process.exit(1);
  }

  const logInput = result.stdout ?? "";
  const commits = parseGitLog(logInput);
  const commitCount = totalCommits(commits);

  if (htmlOutput) {
    // HTML export: generate SVG and wrap it in a self-contained HTML page
    const svg = buildSvg(logInput, repoName);
    const html = wrapSvgInHtml(svg, repoName);
    await Bun.write(htmlOutput, html);
    console.log(`wrote ${htmlOutput} (${commitCount} commits)`);
  } else {
    const outFile = output ?? `timeline.${format}`;
    if (format === "svg") {
      const svg = buildSvg(logInput, repoName);
      await Bun.write(outFile, svg);
    } else {
      const gif = buildGif(logInput);
      await Bun.write(outFile, gif);
    }
    console.log(`wrote ${outFile} (${commitCount} commits)`);
  }

  if (showStats) {
    const byAuthor = commitsByAuthor(commits);
    const contributorCount = byAuthor.length;
    const top = byAuthor[0];
    const topStr = top ? `${top.author} (${top.count} commits)` : "none";
    process.stderr.write(
      `${commitCount} commits · ${contributorCount} contributor${contributorCount !== 1 ? "s" : ""} · top: ${topStr}\n`
    );
  }
}
