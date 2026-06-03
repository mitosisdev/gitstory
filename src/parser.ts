// src/parser.ts — parse git log output into a typed Commit[] array.
//
// Expected log format (use --format=%H%x01%an%x01%ae%x01%aI%x01%s):
//   <sha>\x01<authorName>\x01<authorEmail>\x01<isoTimestamp>\x01<subject>
// One commit per line. Fields are separated by ASCII Unit Separator (\x01)
// so subjects containing common delimiters (|, tab, comma) parse correctly.

export interface Commit {
  sha: string;
  authorName: string;
  authorEmail: string;
  isoTimestamp: string;
  subject: string;
}

const SEP = "\x01";
const FIELDS = 5;

export function parseGitLog(log: string): Commit[] {
  if (!log.trim()) return [];

  const commits: Commit[] = [];
  for (const line of log.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const parts = trimmed.split(SEP);
    if (parts.length < FIELDS) continue;

    commits.push({
      sha: parts[0] ?? "",
      authorName: parts[1] ?? "",
      authorEmail: parts[2] ?? "",
      isoTimestamp: parts[3] ?? "",
      subject: parts.slice(4).join(SEP), // rejoin in case subject contained SEP
    });
  }

  return commits;
}

// The git log format string to pass to --format=
export const GIT_LOG_FORMAT = "%H\x01%an\x01%ae\x01%aI\x01%s";
