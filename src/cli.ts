import { parseGitLog } from "./parser.js";
import { renderTimeline } from "./renderer.js";
import { renderGif } from "./gif.js";

export function buildSvg(logInput: string, repoName?: string): string {
  const commits = parseGitLog(logInput);
  return renderTimeline(commits, repoName);
}

export function buildGif(logInput: string): Buffer {
  const commits = parseGitLog(logInput);
  return renderGif(commits);
}
