#!/usr/bin/env bun
import { writeFileSync } from "node:fs";
import { $ } from "bun";
import { GIT_LOG_FORMAT } from "../src/parser.js";
import { buildSvg, buildGif } from "../src/cli.js";

const args = process.argv.slice(2);
const outputIdx = args.indexOf("--output");
const outputFile = outputIdx !== -1 ? args[outputIdx + 1] : undefined;

const repoNameIdx = args.indexOf("--repo-name");
const repoName = repoNameIdx !== -1 ? args[repoNameIdx + 1] : undefined;

const gifMode = args.includes("--gif");

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
