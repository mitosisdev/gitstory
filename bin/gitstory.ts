#!/usr/bin/env bun
import { writeFileSync } from "node:fs";
import { $ } from "bun";
import { GIT_LOG_FORMAT } from "../src/parser.js";
import { buildSvg, buildGif } from "../src/cli.js";

const args = process.argv.slice(2);

// --out <file>  write SVG to file instead of stdout
const outIdx = args.indexOf("--out");
const outputFile = outIdx !== -1 ? args[outIdx + 1] : undefined;

// --gif <file>  generate animated GIF (capped at 50 most recent commits)
const gifIdx = args.indexOf("--gif");
const gifFile = gifIdx !== -1 ? args[gifIdx + 1] : undefined;

let logInput: string;

// isTTY is true when stdin is a terminal; undefined/false when piped
if (process.stdin.isTTY === true) {
  // Interactive: read git log from the current directory
  const result = await $`git log --format=${GIT_LOG_FORMAT}`.nothrow().quiet();
  if (result.exitCode !== 0) {
    process.stderr.write("gitstory: not a git repository or git not found\n");
    process.exit(1);
  }
  logInput = result.stdout.toString("utf8");
} else {
  // Piped / subprocess: consume stdin
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  const piped = Buffer.concat(chunks).toString("utf8");

  if (piped.trim()) {
    logInput = piped;
  } else {
    // Nothing on stdin (e.g. called from a script without piping) — fall back
    // to reading git log from CWD
    const result = await $`git log --format=${GIT_LOG_FORMAT}`.nothrow().quiet();
    if (result.exitCode !== 0) {
      process.stderr.write("gitstory: not a git repository or git not found\n");
      process.exit(1);
    }
    logInput = result.stdout.toString("utf8");
  }
}

if (gifFile) {
  await buildGif(logInput, gifFile);
  process.stderr.write(`gitstory: wrote animated GIF → ${gifFile}\n`);
}

if (!gifFile || outputFile) {
  const svg = buildSvg(logInput);
  if (outputFile) {
    writeFileSync(outputFile, svg, "utf8");
  } else if (!gifFile) {
    process.stdout.write(svg + "\n");
  }
}
