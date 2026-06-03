import { parseGitLog } from "./parser.js";
import { renderTimeline } from "./renderer.js";

export function buildSvg(logInput: string): string {
  const commits = parseGitLog(logInput);
  return renderTimeline(commits);
}
