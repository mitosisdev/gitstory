import type { Commit } from "./parser.js";

const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 160;
const MARGIN = 50;
const TIMELINE_Y = 100;
const DOT_R = 4;
const MAX_LABEL_CHARS = 22;

// Visual spec colours
const BG_COLOR = "#0b0d10";
const DOT_COLOR = "#8A2BE2";
const AXIS_COLOR = "#334155";
const LABEL_COLOR = "#94a3b8";
const HEADING_COLOR = "#e2e8f0";

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
