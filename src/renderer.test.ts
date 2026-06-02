import { describe, expect, it } from "bun:test";
import { renderTimeline } from "./renderer.js";
import type { Commit } from "./parser.js";

function makeCommit(sha: string, subject: string, isoTimestamp: string): Commit {
  return { sha, authorName: "test", authorEmail: "test@test.com", isoTimestamp, subject };
}

const JAN = makeCommit("aaa1", "feat: first commit", "2026-01-10T10:00:00Z");
const FEB = makeCommit("bbb2", "feat: second commit", "2026-02-15T10:00:00Z");
const JAN2 = makeCommit("ccc3", "fix: same month", "2026-01-20T10:00:00Z");
const LONG = makeCommit("ddd4", "feat: a very long subject that exceeds twenty characters", "2026-03-01T10:00:00Z");
const XML = makeCommit("eee5", "feat: <script>alert('xss')</script>", "2026-01-05T10:00:00Z");

describe("renderTimeline", () => {
  it("returns valid SVG for empty input", () => {
    const svg = renderTimeline([]);
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
  });

  it("returns valid SVG for single commit", () => {
    const svg = renderTimeline([JAN]);
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
    expect(svg).toContain("<circle");
  });

  it("produces one circle per commit", () => {
    const svg = renderTimeline([JAN, FEB, JAN2]);
    const circleCount = (svg.match(/<circle/g) ?? []).length;
    expect(circleCount).toBe(3);
  });

  it("includes commit subject text", () => {
    const svg = renderTimeline([JAN]);
    expect(svg).toContain("feat: first commit");
  });

  it("truncates long subjects in visible label", () => {
    const svg = renderTimeline([LONG]);
    expect(svg).toContain("feat: a very long subj…");
  });

  it("includes full subject in title element", () => {
    const svg = renderTimeline([LONG]);
    expect(svg).toContain("feat: a very long subject that exceeds twenty characters");
  });

  it("escapes XML special characters in output", () => {
    const svg = renderTimeline([XML]);
    expect(svg).not.toContain("<script>");
    expect(svg).toContain("&lt;script&gt;");
  });

  it("shows month labels when commits span multiple months", () => {
    const svg = renderTimeline([JAN, FEB]);
    expect(svg).toContain("Jan");
    expect(svg).toContain("Feb");
  });

  it("does not include month label section for same-month commits", () => {
    const svg = renderTimeline([JAN, JAN2]);
    const janCount = (svg.match(/Jan/g) ?? []).length;
    expect(janCount).toBe(1);
  });

  it("has no DOM dependency — pure string output", () => {
    const svg = renderTimeline([JAN, FEB]);
    expect(typeof svg).toBe("string");
    expect(svg.length).toBeGreaterThan(0);
  });
});
