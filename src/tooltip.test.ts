import { describe, expect, it } from "bun:test";
import { wrapSvgInHtml } from "./html.js";
import { renderTimeline } from "./renderer.js";
import type { Commit } from "./parser.js";

function makeCommit(sha: string, subject: string, isoTimestamp: string, author = "Alice"): Commit {
  return { sha, authorName: author, authorEmail: "alice@test.com", isoTimestamp, subject };
}

const C1 = makeCommit("abc1234def", "feat: add tooltip feature", "2026-01-10T10:00:00Z");
const C2 = makeCommit("xyz9876fed", "fix: resolve hover bug", "2026-02-15T10:00:00Z", "Bob");

describe("HTML tooltip — data attributes on circles", () => {
  it("circle elements have data-sha attribute", () => {
    const svg = renderTimeline([C1, C2]);
    expect(svg).toContain('data-sha="abc1234def"');
    expect(svg).toContain('data-sha="xyz9876fed"');
  });

  it("circle elements have data-author attribute", () => {
    const svg = renderTimeline([C1, C2]);
    expect(svg).toContain('data-author="Alice"');
    expect(svg).toContain('data-author="Bob"');
  });

  it("circle elements have data-date attribute", () => {
    const svg = renderTimeline([C1]);
    expect(svg).toContain('data-date="2026-01-10T10:00:00Z"');
  });

  it("circle elements have data-message attribute with commit subject", () => {
    const svg = renderTimeline([C1]);
    expect(svg).toContain('data-message="feat: add tooltip feature"');
  });

  it("data-message escapes XML special characters", () => {
    const bad = makeCommit("bad1", 'feat: <script>alert("xss")</script>', "2026-01-01T00:00:00Z");
    const svg = renderTimeline([bad]);
    expect(svg).not.toContain("<script>");
    expect(svg).toContain("&lt;script&gt;");
  });

  it("circle elements do NOT use legacy data-msg attribute", () => {
    const svg = renderTimeline([C1]);
    expect(svg).not.toContain("data-msg=");
  });
});

describe("HTML tooltip — wrapSvgInHtml injects script and style", () => {
  it("HTML output contains a <script> block", () => {
    const svg = renderTimeline([C1]);
    const html = wrapSvgInHtml(svg, "test-repo");
    expect(html).toContain("<script>");
  });

  it("script block adds mouseenter listener on circles", () => {
    const svg = renderTimeline([C1]);
    const html = wrapSvgInHtml(svg, "test-repo");
    expect(html).toContain("mouseenter");
  });

  it("script block adds mouseleave listener on circles", () => {
    const svg = renderTimeline([C1]);
    const html = wrapSvgInHtml(svg, "test-repo");
    expect(html).toContain("mouseleave");
  });

  it("HTML output contains tooltip CSS style block", () => {
    const svg = renderTimeline([C1]);
    const html = wrapSvgInHtml(svg, "test-repo");
    expect(html).toContain("#1e2030");
  });

  it("tooltip style has border-radius: 6px", () => {
    const svg = renderTimeline([C1]);
    const html = wrapSvgInHtml(svg, "test-repo");
    expect(html).toContain("border-radius: 6px");
  });

  it("tooltip style has padding: 8px 12px", () => {
    const svg = renderTimeline([C1]);
    const html = wrapSvgInHtml(svg, "test-repo");
    expect(html).toContain("padding: 8px 12px");
  });

  it("tooltip style has font-family: monospace", () => {
    const svg = renderTimeline([C1]);
    const html = wrapSvgInHtml(svg, "test-repo");
    const count = (html.match(/monospace/g) ?? []).length;
    expect(count).toBeGreaterThanOrEqual(2);
  });

  it("script block reads data-sha from the hovered circle", () => {
    const svg = renderTimeline([C1]);
    const html = wrapSvgInHtml(svg, "test-repo");
    expect(html).toContain("data-sha");
  });

  it("script block reads data-message from the hovered circle", () => {
    const svg = renderTimeline([C1]);
    const html = wrapSvgInHtml(svg, "test-repo");
    expect(html).toContain("data-message");
  });

  it("script block reads data-author from the hovered circle", () => {
    const svg = renderTimeline([C1]);
    const html = wrapSvgInHtml(svg, "test-repo");
    expect(html).toContain("data-author");
  });

  it("script block reads data-date from the hovered circle", () => {
    const svg = renderTimeline([C1]);
    const html = wrapSvgInHtml(svg, "test-repo");
    expect(html).toContain("data-date");
  });

  it("script does NOT reference legacy data-msg attribute", () => {
    const svg = renderTimeline([C1]);
    const html = wrapSvgInHtml(svg, "test-repo");
    // The JS should read data-message, not the old data-msg
    expect(html).not.toContain("data-msg");
  });

  it("script block clamps tooltip position to avoid right-edge overflow", () => {
    const svg = renderTimeline([C1]);
    const html = wrapSvgInHtml(svg, "test-repo");
    // Viewport-aware positioning should use window.innerWidth
    expect(html).toContain("innerWidth");
  });

  it("script block clamps tooltip position to avoid bottom-edge overflow", () => {
    const svg = renderTimeline([C1]);
    const html = wrapSvgInHtml(svg, "test-repo");
    // Viewport-aware positioning should use window.innerHeight
    expect(html).toContain("innerHeight");
  });

  it("tooltip div has id gs-tooltip", () => {
    const svg = renderTimeline([C1]);
    const html = wrapSvgInHtml(svg, "test-repo");
    expect(html).toContain('id="gs-tooltip"');
  });
});

describe("SVG-only output — no script injection", () => {
  it("SVG-only output does not contain a <script> block", () => {
    const svg = renderTimeline([C1]);
    expect(svg).not.toContain("<script>");
  });

  it("SVG-only output does not contain tooltip style class", () => {
    const svg = renderTimeline([C1]);
    expect(svg).not.toContain("#1e2030");
  });
});
