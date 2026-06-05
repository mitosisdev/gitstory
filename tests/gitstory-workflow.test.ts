// tests/gitstory-workflow.test.ts
import { test, expect, describe } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";
import { parse } from "yaml";

const workflowPath = join(import.meta.dir, "../.github/workflows/gitstory.yml");

describe(".github/workflows/gitstory.yml", () => {
  function parsed(): any {
    const raw = readFileSync(workflowPath, "utf8");
    return parse(raw);
  }

  test("workflow file exists and is valid YAML", () => {
    const wf = parsed();
    expect(wf).toBeTruthy();
  });

  test("triggers on push", () => {
    const wf = parsed();
    expect(wf.on).toHaveProperty("push");
  });

  test("triggers on workflow_dispatch", () => {
    const wf = parsed();
    expect(wf.on).toHaveProperty("workflow_dispatch");
  });

  test("has a timeline job", () => {
    const wf = parsed();
    expect(wf.jobs).toHaveProperty("timeline");
  });

  test("checkout uses fetch-depth: 0", () => {
    const wf = parsed();
    const steps: any[] = wf.jobs.timeline.steps;
    const checkoutStep = steps.find(
      (s) => typeof s.uses === "string" && s.uses.startsWith("actions/checkout")
    );
    expect(checkoutStep).toBeDefined();
    expect(checkoutStep.with["fetch-depth"]).toBe(0);
  });

  test("has a step using oven-sh/setup-bun", () => {
    const wf = parsed();
    const steps: any[] = wf.jobs.timeline.steps;
    const setupBunStep = steps.find(
      (s) => typeof s.uses === "string" && s.uses.startsWith("oven-sh/setup-bun")
    );
    expect(setupBunStep).toBeDefined();
  });

  test("has a step that generates timeline.svg", () => {
    const wf = parsed();
    const steps: any[] = wf.jobs.timeline.steps;
    const generateStep = steps.find(
      (s) => typeof s.run === "string" && s.run.includes("timeline.svg")
    );
    expect(generateStep).toBeDefined();
  });

  test("commit step uses [skip ci] to avoid loops", () => {
    const wf = parsed();
    const steps: any[] = wf.jobs.timeline.steps;
    const commitStep = steps.find(
      (s) => typeof s.run === "string" && s.run.includes("[skip ci]")
    );
    expect(commitStep).toBeDefined();
  });

  test("commit step guards with git diff --quiet", () => {
    const wf = parsed();
    const steps: any[] = wf.jobs.timeline.steps;
    const commitStep = steps.find(
      (s) => typeof s.run === "string" && s.run.includes("git diff --quiet")
    );
    expect(commitStep).toBeDefined();
  });

  test("job has contents: write permission", () => {
    const wf = parsed();
    expect(wf.jobs.timeline.permissions).toHaveProperty("contents", "write");
  });
});
