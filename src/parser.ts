// src/parser.ts — parse git log output into a typed Commit[] array.
//
// Expected log format (use --format="%H|%an|%ae|%aI|%s"):
//   <sha>|<authorName>|<authorEmail>|<isoTimestamp>|<subject>
// One commit per line. Fields are separated by pipe (|).

export interface Commit {
  sha: string;
  authorName: string;
  authorEmail: string;
  isoTimestamp: string;
  subject: string;
}

const SEP = "|";
const FIELDS = 5;

export function parseGitLog(raw: string): Commit[] {
  if (!raw.trim()) return [];

  const commits: Commit[] = [];
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const parts = trimmed.split(SEP);
    if (parts.length < FIELDS) continue;

    commits.push({
      sha: parts[0] ?? "",
      authorName: parts[1] ?? "",
      authorEmail: parts[2] ?? "",
      isoTimestamp: parts[3] ?? "",
      subject: parts.slice(4).join(SEP),
    });
  }

  return commits;
}

// The git log format string to pass to --format=
export const GIT_LOG_FORMAT = "%H|%an|%ae|%aI|%s";
