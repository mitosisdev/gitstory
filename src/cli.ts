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

if (import.meta.main) {
  const args = process.argv.slice(2);

  // Parse arguments
  let repoPath = ".";
  let format: "svg" | "gif" = "svg";
  let output: string | null = null;
  let htmlOutput: string | null = null;
  let showStats = false;

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
    } else if (!arg.startsWith("--")) {
      repoPath = arg;
    } else {
      console.error(`error: unknown flag ${arg}`);
      process.exit(1);
    }
  }

  const absRepoPath = resolve(repoPath);
  const repoName = basename(absRepoPath);

  // Run git log
  const result = spawnSync(
    "git",
    ["log", `--format=${GIT_LOG_FORMAT}`],
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
