import type { Commit } from "./parser.js";

const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 160;
const MARGIN = 50;
const TIMELINE_Y = 100;
const DOT_R = 4;
const MAX_LABEL_CHARS = 22;
const MAX_LEGEND_AUTHORS = 5;

// Visual spec colours
const BG_COLOR = "#0b0d10";
const DOT_COLOR = "#8A2BE2";
const AXIS_COLOR = "#334155";
const LABEL_COLOR = "#94a3b8";
const HEADING_COLOR = "#e2e8f0";
const LEGEND_HEADING_COLOR = "#cbd5e1";
const LEGEND_ITEM_COLOR = "#94a3b8";

interface AuthorCount {
  name: string;
  count: number;
}

function buildAuthorCounts(commits: Commit[]): AuthorCount[] {
  const map = new Map<string, number>();
  for (const c of commits) {
    map.set(c.authorName, (map.get(c.authorName) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, MAX_LEGEND_AUTHORS);
}

function buildLegend(authors: AuthorCount[], svgHeight: number): string[] {
  const lines: string[] = [];
  const legendX = CANVAS_WIDTH - MARGIN;
  const legendStartY = svgHeight - (authors.length * 14 + 18);

  lines.push(
    `  <text x="${legendX}" y="${legendStartY}" font-size="10" font-family="monospace" text-anchor="end" fill="${LEGEND_HEADING_COLOR}" font-weight="bold">Contributors</text>`,
  );

  for (let i = 0; i < authors.length; i++) {
    const author = authors[i]!;
    const y = legendStartY + 14 + i * 14;
    const label = `${escapeXml(author.name)} — ${author.count} commits`;
    lines.push(
      `  <text x="${legendX}" y="${y}" font-size="10" font-family="monospace" text-anchor="end" fill="${LEGEND_ITEM_COLOR}">${label}</text>`,
    );
  }

  return lines;
}

export function renderTimeline(commits: Commit[], repoName?: string): string {
  const headingHeight = repoName ? 30 : 0;
  const svgHeight = CANVAS_HEIGHT + headingHeight;
  const timelineY = TIMELINE_Y + headingHeight;

  const bgRect = `  <rect width="100%" height="100%" fill="${BG_COLOR}"/>`;

  const heading = repoName
    ? `  <text x="${CANVAS_WIDTH / 2}" y="22" font-size="18" font-weight="bold" text-anchor="middle" fill="${HEADING_COLOR}">${escapeXml(repoName)}</text>`
    : "";

  if (commits.length === 0) {
    const lines = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_WIDTH}" height="${svgHeight}">`,
      bgRect,
    ];
    if (heading) lines.push(heading);
    lines.push("</svg>");
    return lines.join("\n");
  }

  const count = commits.length;
  const usableWidth = CANVAS_WIDTH - 2 * MARGIN;
  const step = count === 1 ? 0 : usableWidth / (count - 1);

  const monthTickLines = buildMonthLabels(commits, timelineY);
  const dots = commits.map((c, i) => {
    const x = MARGIN + i * step;
    const label =
      c.subject.length > MAX_LABEL_CHARS
        ? c.subject.slice(0, MAX_LABEL_CHARS) + "…"
        : c.subject;
    return [
      `  <circle cx="${x}" cy="${timelineY}" r="${DOT_R}" fill="${DOT_COLOR}">`,
      `    <title>${escapeXml(c.subject)}</title>`,
      `  </circle>`,
      `  <text x="${x}" y="${timelineY + 18}" font-size="10" text-anchor="middle" fill="${LABEL_COLOR}">${escapeXml(label)}</text>`,
    ].join("\n");
  });

  const lines: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_WIDTH}" height="${svgHeight}">`,
    bgRect,
  ];

  if (heading) lines.push(heading);

  // Axis line
  lines.push(
    `  <line x1="${MARGIN}" y1="${timelineY}" x2="${CANVAS_WIDTH - MARGIN}" y2="${timelineY}" stroke="${AXIS_COLOR}" stroke-width="2"/>`,
  );

  for (const { x, label } of monthTickLines) {
    lines.push(
      `  <text x="${x}" y="${timelineY - 14}" font-size="10" font-family="monospace" text-anchor="middle" fill="${LABEL_COLOR}">${label}</text>`,
    );
  }

  lines.push(...dots);

  const authorCounts = buildAuthorCounts(commits);
  if (authorCounts.length > 0) {
    lines.push(...buildLegend(authorCounts, svgHeight));
  }

  lines.push("</svg>");
  return lines.join("\n");
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

interface MonthLabel {
  x: number;
  label: string;
}

function buildMonthLabels(commits: Commit[], _timelineY: number): MonthLabel[] {
  if (commits.length < 2) return [];

  const dates = commits.map((c) => new Date(c.isoTimestamp));
  const firstTime = dates[0]?.getTime() ?? 0;
  const lastTime = dates[dates.length - 1]?.getTime() ?? 0;
  const totalTime = lastTime - firstTime;

  if (totalTime === 0) return [];

  const usableWidth = CANVAS_WIDTH - 2 * MARGIN;
  const seen = new Set<string>();
  const result: MonthLabel[] = [];

  for (const d of dates) {
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!seen.has(key)) {
      seen.add(key);
      const ratio = (d.getTime() - firstTime) / totalTime;
      const x = MARGIN + ratio * usableWidth;
      result.push({
        x,
        label: d.toLocaleString("en-US", { month: "short", year: "numeric" }),
      });
    }
  }

  return result;
}
