import { parseGitLog } from "./parser.js";
import { renderTimeline } from "./renderer.js";
import { exportGif } from "./gif.js";

/** Maximum commits used for GIF self-demo (avoids huge files on large repos). */
const GIF_MAX_COMMITS = 50;

export function buildSvg(logInput: string): string {
  const commits = parseGitLog(logInput);
  return renderTimeline(commits);
}

export async function buildGif(
  logInput: string,
  outputPath: string,
): Promise<void> {
  const all = parseGitLog(logInput);
  // Cap to the 50 most recent commits — take last GIF_MAX_COMMITS entries
  const commits =
    all.length > GIF_MAX_COMMITS ? all.slice(all.length - GIF_MAX_COMMITS) : all;
  await exportGif(commits, outputPath);
}
