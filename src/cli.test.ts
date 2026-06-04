import { describe, expect, it } from "bun:test";
import { buildSvg } from "./cli.js";
import { GIT_LOG_FORMAT } from "./parser.js";

const SEP = "|";

function makeLogLine(sha: string, subject: string, iso: string): string {
  return [sha, "Author", "a@b.com", iso, subject].join(SEP);
}

const ONE_COMMIT = makeLogLine("abc123", "feat: first", "2026-01-10T10:00:00Z");
const TWO_COMMITS = [
  makeLogLine("aaa", "feat: one", "2026-01-10T10:00:00Z"),
  makeLogLine("bbb", "feat: two", "2026-02-15T10:00:00Z"),
].join("\n");

describe("buildSvg", () => {
  it("returns valid SVG for empty log", () => {
    const svg = buildSvg("");
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
  });

  it("returns SVG with one commit dot for one commit", () => {
    const svg = buildSvg(ONE_COMMIT);
    expect(svg).toContain("<circle");
    expect(svg).toContain("feat: first");
  });

  it("returns SVG with two commit dots for two commits", () => {
    const svg = buildSvg(TWO_COMMITS);
    const circleCount = (svg.match(/<circle/g) ?? []).length;
    expect(circleCount).toBe(2);
  });

  it("does not crash on malformed input lines", () => {
    const messy = "not-a-valid-line\n" + ONE_COMMIT + "\nalso-bad";
    const svg = buildSvg(messy);
    expect(svg).toContain("<svg");
  });

  it("GIT_LOG_FORMAT is the canonical format string", () => {
    expect(GIT_LOG_FORMAT).toContain("%H");
    expect(GIT_LOG_FORMAT).toContain("%an");
    expect(GIT_LOG_FORMAT).toContain("%aI");
    expect(GIT_LOG_FORMAT).toContain("%s");
  });
});
