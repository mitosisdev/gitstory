import { describe, expect, it } from "bun:test";
import { wrapSvgInHtml } from "../src/html.js";

describe("wrapSvgInHtml", () => {
  it("returns a string starting with <!DOCTYPE html>", () => {
    const result = wrapSvgInHtml("<svg></svg>", "Test");
    expect(result.startsWith("<!DOCTYPE html>")).toBe(true);
  });

  it("contains <title>My Timeline</title> when title is 'My Timeline'", () => {
    const result = wrapSvgInHtml("<svg></svg>", "My Timeline");
    expect(result).toContain("<title>My Timeline</title>");
  });

  it("contains the exact SVG string passed in", () => {
    const svg = '<svg width="100" height="100"><circle r="50"/></svg>';
    const result = wrapSvgInHtml(svg, "Test");
    expect(result).toContain(svg);
  });

  it("contains background: #0b0d10 for dark background", () => {
    const result = wrapSvgInHtml("<svg></svg>", "Test");
    expect(result).toContain("background: #0b0d10");
  });

  it("contains display: flex for centering", () => {
    const result = wrapSvgInHtml("<svg></svg>", "Test");
    expect(result).toContain("display: flex");
  });

  it("XSS safety: title with <script>bad</script> is escaped in the <title> tag", () => {
    const result = wrapSvgInHtml("<svg></svg>", "<script>bad</script>");
    expect(result).toContain("<title>&lt;script&gt;bad&lt;/script&gt;</title>");
    expect(result).not.toContain("<title><script>");
  });
});
