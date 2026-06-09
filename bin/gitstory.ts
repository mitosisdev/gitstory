#!/usr/bin/env bun
import { writeFileSync } from "node:fs";
import { $ } from "bun";
import { GIT_LOG_FORMAT, parseGitLog } from "../src/parser.js";
import { buildSvg, buildGif } from "../src/cli.js";
import { formatStats, resolveStatsMonths } from "../src/stats-format.js";

const args = process.argv.slice(2);
const outputIdx = args.indexOf("--output");
const outputFile = outputIdx !== -1 ? args[outputIdx + 1] : undefined;

const repoNameIdx = args.indexOf("--repo-name");
const repoName = repoNameIdx !== -1 ? args[repoNameIdx + 1] : undefined;

const gifMode = args.includes("--gif");
const showStats = args.includes("--stats");
const statsMonthsIdx = args.indexOf("--stats-months");
const statsMonthsRaw = statsMonthsIdx !== -1 ? args[statsMonthsIdx + 1] : undefined;
const statsMonths = resolveStatsMonths(statsMonthsRaw);

let logInput: string;

if (!process.stdin.isTTY) {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  logInput = Buffer.concat(chunks).toString("utf8");
} else {
  const result = await $`git log --format=${GIT_LOG_FORMAT}`.nothrow().quiet();
  if (result.exitCode !== 0) {
    process.stderr.write("gitstory: not a git repository or git not found\n");
    process.exit(1);
  }
  logInput = result.stdout.toString("utf8");
}

if (gifMode) {
  const gif = buildGif(logInput);
  const dest = outputFile ?? "timeline.gif";
  writeFileSync(dest, gif);
} else {
  const svg = buildSvg(logInput, repoName);
  if (outputFile) {
    writeFileSync(outputFile, svg, "utf8");
  } else {
    process.stdout.write(svg + "\n");
  }
}

// --stats: emit a summary + per-month breakdown table to stderr so it never
// pollutes the SVG/GIF written to stdout (which is commonly piped to a file).
if (showStats) {
  const records = parseGitLog(logInput).map((c) => ({
    hash: c.sha,
    author: c.authorName,
    date: new Date(c.isoTimestamp),
    message: c.subject,
  }));
  process.stderr.write(formatStats(records, { statsMonths }) + "\n");
}
