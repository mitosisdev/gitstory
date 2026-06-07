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
  // ── existing structural tests ──────────────────────────────────────────────

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

  // ── visual spec tests (TDD — these drive the renderer upgrade) ────────────

  it("has dark #0b0d10 background rect", () => {
    const svg = renderTimeline([JAN]);
    expect(svg).toContain("#0b0d10");
  });

  it("uses #8A2BE2 (purple) fill for dots", () => {
    const svg = renderTimeline([JAN]);
    expect(svg).toContain('fill="#8A2BE2"');
  });

  it("timeline axis uses dark slate stroke #334155", () => {
    const svg = renderTimeline([JAN, FEB]);
    expect(svg).toContain("#334155");
  });

  it("date labels use monospace font-family", () => {
    const svg = renderTimeline([JAN, FEB]);
    expect(svg).toContain("monospace");
  });

  it("date labels are 10px font-size", () => {
    const svg = renderTimeline([JAN, FEB]);
    // month tick labels should be font-size="10"
    expect(svg).toContain('font-size="10"');
  });

  it("shows repo name heading when repoName is provided", () => {
    const svg = renderTimeline([JAN], "my-repo");
    expect(svg).toContain("my-repo");
  });

  it("does not render a heading element when repoName is omitted", () => {
    const svg = renderTimeline([JAN]);
    // No <text> with centered heading when no repoName — just commit labels
    // We verify by checking repo name is absent
    expect(svg).not.toContain("undefined");
  });

  it("canvas width is 900", () => {
    const svg = renderTimeline([JAN]);
    expect(svg).toContain('width="900"');
  });

  it("canvas height is 160", () => {
    const svg = renderTimeline([JAN]);
    expect(svg).toContain('height="160"');
  });

  // ── contributor legend tests ───────────────────────────────────────────────

  it("shows top author name in legend", () => {
    const commits: Commit[] = [
      { sha: "a1", authorName: "Alice", authorEmail: "alice@x.com", isoTimestamp: "2026-01-01T00:00:00Z", subject: "feat: one" },
      { sha: "a2", authorName: "Alice", authorEmail: "alice@x.com", isoTimestamp: "2026-01-02T00:00:00Z", subject: "feat: two" },
      { sha: "b1", authorName: "Bob", authorEmail: "bob@x.com", isoTimestamp: "2026-01-03T00:00:00Z", subject: "fix: three" },
    ];
    const svg = renderTimeline(commits);
    expect(svg).toContain("Alice");
  });

  it("shows commit count next to author name", () => {
    const commits: Commit[] = [
      { sha: "a1", authorName: "Alice", authorEmail: "alice@x.com", isoTimestamp: "2026-01-01T00:00:00Z", subject: "feat: one" },
      { sha: "a2", authorName: "Alice", authorEmail: "alice@x.com", isoTimestamp: "2026-01-02T00:00:00Z", subject: "feat: two" },
      { sha: "b1", authorName: "Bob", authorEmail: "bob@x.com", isoTimestamp: "2026-01-03T00:00:00Z", subject: "fix: three" },
    ];
    const svg = renderTimeline(commits);
    // Alice has 2 commits — the count "2" should appear in the legend
    expect(svg).toContain("2 commits");
  });

  it("sorts legend by commit count descending (top author first)", () => {
    const commits: Commit[] = [
      { sha: "b1", authorName: "Bob", authorEmail: "bob@x.com", isoTimestamp: "2026-01-01T00:00:00Z", subject: "fix: one" },
      { sha: "a1", authorName: "Alice", authorEmail: "alice@x.com", isoTimestamp: "2026-01-02T00:00:00Z", subject: "feat: two" },
      { sha: "a2", authorName: "Alice", authorEmail: "alice@x.com", isoTimestamp: "2026-01-03T00:00:00Z", subject: "feat: three" },
    ];
    const svg = renderTimeline(commits);
    // Search for legend entries specifically ("Name — N commits" format)
    const aliceLegendPos = svg.indexOf("Alice —");
    const bobLegendPos = svg.indexOf("Bob —");
    expect(aliceLegendPos).toBeGreaterThan(-1);
    expect(bobLegendPos).toBeGreaterThan(-1);
    // Alice (2 commits) appears before Bob (1 commit) in the legend
    expect(aliceLegendPos).toBeLessThan(bobLegendPos);
  });

  it("limits legend to top 5 authors", () => {
    // Use generic commit subjects so author names only appear in the legend
    const authorNames = ["Alice", "Bob", "Carol", "Dave", "Eve", "Frank"];
    const commits: Commit[] = authorNames.flatMap((name, i) =>
      Array.from({ length: 6 - i }, (_, j) => ({
        sha: `${name}${j}`,
        authorName: name,
        authorEmail: `${name.toLowerCase()}@x.com`,
        isoTimestamp: `2026-01-0${j + 1}T00:00:00Z`,
        subject: `feat: commit`,
      }))
    );
    const svg = renderTimeline(commits);
    // Frank is the 6th author (fewest commits) and should NOT appear in the legend
    // Check legend entries specifically ("Name — N commits" format)
    expect(svg).not.toContain("Frank —");
    // Alice through Eve (top 5) should appear in the legend
    expect(svg).toContain("Alice —");
    expect(svg).toContain("Eve —");
  });

  it("does not render legend for empty commits", () => {
    const svg = renderTimeline([]);
    // No legend section in empty SVG
    expect(svg).not.toContain("Contributors");
  });

  it("escapes XML special characters in author names in legend", () => {
    const commits: Commit[] = [
      { sha: "x1", authorName: "O'Brien <test>", authorEmail: "x@x.com", isoTimestamp: "2026-01-01T00:00:00Z", subject: "feat: one" },
    ];
    const svg = renderTimeline(commits);
    expect(svg).not.toContain("<test>");
    expect(svg).toContain("&lt;test&gt;");
  });
});
