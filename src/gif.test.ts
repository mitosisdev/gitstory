import { describe, test, expect, afterAll } from "bun:test";
import { existsSync, unlinkSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Commit } from "./parser.js";
import { exportGif } from "./gif.js";

const FIXTURE_COMMITS: Commit[] = [
  {
    sha: "aaa0001",
    authorName: "Alice",
    authorEmail: "alice@example.com",
    isoTimestamp: "2024-01-01T00:00:00Z",
    subject: "initial commit",
  },
  {
    sha: "bbb0002",
    authorName: "Bob",
    authorEmail: "bob@example.com",
    isoTimestamp: "2024-02-01T00:00:00Z",
    subject: "add feature",
  },
  {
    sha: "ccc0003",
    authorName: "Alice",
    authorEmail: "alice@example.com",
    isoTimestamp: "2024-03-01T00:00:00Z",
    subject: "fix bug",
  },
];

const OUT_PATH = join(tmpdir(), `gitstory-test-${Date.now()}.gif`);

afterAll(() => {
  if (existsSync(OUT_PATH)) unlinkSync(OUT_PATH);
});

describe("exportGif", () => {
  test("resolves without throwing and writes a non-empty file", async () => {
    await expect(exportGif(FIXTURE_COMMITS, OUT_PATH)).resolves.toBeUndefined();
    expect(existsSync(OUT_PATH)).toBe(true);
    const buf = readFileSync(OUT_PATH);
    expect(buf.length).toBeGreaterThan(0);
  });

  test("output starts with GIF magic bytes (GIF89a)", async () => {
    const buf = readFileSync(OUT_PATH);
    const magic = buf.slice(0, 6).toString("ascii");
    expect(magic).toMatch(/^GIF8[79]a/);
  });

  test("handles single commit without throwing", async () => {
    const singlePath = join(tmpdir(), `gitstory-single-${Date.now()}.gif`);
    try {
      await expect(
        exportGif([FIXTURE_COMMITS[0]!], singlePath),
      ).resolves.toBeUndefined();
      expect(existsSync(singlePath)).toBe(true);
    } finally {
      if (existsSync(singlePath)) unlinkSync(singlePath);
    }
  });

  test("handles empty commits array without throwing", async () => {
    const emptyPath = join(tmpdir(), `gitstory-empty-${Date.now()}.gif`);
    try {
      await expect(exportGif([], emptyPath)).resolves.toBeUndefined();
    } finally {
      if (existsSync(emptyPath)) unlinkSync(emptyPath);
    }
  });
});
