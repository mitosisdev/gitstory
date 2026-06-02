import type { Commit } from "./parser.js";

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 120;
const MARGIN = 40;
const TIMELINE_Y = 70;
const DOT_R = 5;
const MAX_LABEL_CHARS = 22;

export function renderTimeline(commits: Commit[]): string {
  if (commits.length === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}"></svg>`;
  }

  const count = commits.length;
  const usableWidth = CANVAS_WIDTH - 2 * MARGIN;
  const step = count === 1 ? 0 : usableWidth / (count - 1);

  const monthLines = buildMonthLabels(commits);
  const dots = commits.map((c, i) => {
    const x = MARGIN + i * step;
    const label =
      c.subject.length > MAX_LABEL_CHARS
        ? c.subject.slice(0, MAX_LABEL_CHARS) + "…"
        : c.subject;
    return [
      `  <circle cx="${x}" cy="${TIMELINE_Y}" r="${DOT_R}" fill="#333">`,
      `    <title>${escapeXml(c.subject)}</title>`,
      `  </circle>`,
      `  <text x="${x}" y="${TIMELINE_Y + 20}" font-size="10" text-anchor="middle" fill="#555">${escapeXml(label)}</text>`,
    ].join("\n");
  });

  const lines: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}">`,
    `  <line x1="${MARGIN}" y1="${TIMELINE_Y}" x2="${CANVAS_WIDTH - MARGIN}" y2="${TIMELINE_Y}" stroke="#ccc" stroke-width="2"/>`,
  ];

  for (const { x, label } of monthLines) {
    lines.push(`  <text x="${x}" y="20" font-size="11" text-anchor="middle" fill="#888">${label}</text>`);
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

function buildMonthLabels(commits: Commit[]): MonthLabel[] {
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
