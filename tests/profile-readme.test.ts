import { describe, it, expect } from "bun:test";
import { existsSync, readFileSync } from "fs";
import * as path from "path";

describe("docs/profile-readme.md", () => {
  const docPath = path.join(import.meta.dir, "../docs/profile-readme.md");
  it("exists", () => expect(existsSync(docPath)).toBe(true));
  it("contains workflow YAML block", () => {
    const content = readFileSync(docPath, "utf8");
    expect(content).toContain("```yaml");
    expect(content).toContain("gitstory");
  });
  it("contains embed syntax", () => {
    const content = readFileSync(docPath, "utf8");
    expect(content).toContain("timeline.svg");
  });
});
