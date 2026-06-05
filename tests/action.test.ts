// tests/action.test.ts
import { test, expect, describe } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";
import { parse } from "yaml";

const actionPath = join(import.meta.dir, "../action.yml");

describe("action.yml", () => {
  let action: any;

  test("action.yml exists and is valid YAML", () => {
    const raw = readFileSync(actionPath, "utf8");
    action = parse(raw);
    expect(action).toBeTruthy();
  });

  test("runs.using is composite", () => {
    const raw = readFileSync(actionPath, "utf8");
    const parsed = parse(raw);
    expect(parsed.runs.using).toBe("composite");
  });

  test("inputs.repo-path exists", () => {
    const raw = readFileSync(actionPath, "utf8");
    const parsed = parse(raw);
    expect(parsed.inputs["repo-path"]).toBeDefined();
  });

  test("inputs.out exists", () => {
    const raw = readFileSync(actionPath, "utf8");
    const parsed = parse(raw);
    expect(parsed.inputs["out"]).toBeDefined();
  });

  test("has a step that uses oven-sh/setup-bun", () => {
    const raw = readFileSync(actionPath, "utf8");
    const parsed = parse(raw);
    const steps: any[] = parsed.runs.steps;
    const setupBunStep = steps.find(
      (s) => typeof s.uses === "string" && s.uses.startsWith("oven-sh/setup-bun")
    );
    expect(setupBunStep).toBeDefined();
  });
});
