# GitHub Profile README Integration

Embed a live gitstory commit timeline in your GitHub Profile README with a GitHub Actions workflow that auto-regenerates it on a schedule.

## Prerequisites

- A GitHub account with a Profile README repo (a repo named `username/username`)
- At least a few commits in the repo so the timeline has something to render
- No local install needed — the workflow handles everything via `bunx gitstory`

## Step 1: Create the workflow file

Create `.github/workflows/gitstory.yml` in your Profile README repo:

```yaml
name: Update gitstory timeline
on:
  push:
    branches: [main]
  schedule:
    - cron: '0 6 * * *'

jobs:
  update-timeline:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: oven-sh/setup-bun@v2
      - run: bunx gitstory . --out timeline.svg
      - name: Commit timeline
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add timeline.svg
          git diff --staged --quiet || git commit -m "chore: update gitstory timeline [skip ci]"
          git push
```

**What each part does:**

- **`schedule: cron '0 6 * * *'`** — runs every day at 06:00 UTC, keeping your timeline fresh automatically. Also triggers on every push to `main` so the SVG is always up to date.
- **`fetch-depth: 0`** — checks out the full git history. Without this, GitHub Actions only fetches the latest commit and the timeline renders nearly empty.
- **`oven-sh/setup-bun@v2`** — installs Bun so `bunx` is available in the runner.
- **`bunx gitstory . --out timeline.svg`** — runs gitstory on the current repo and writes the output to `timeline.svg`. `bunx` downloads and runs gitstory without a separate install step.
- **`git diff --staged --quiet || ...`** — only commits if `timeline.svg` actually changed, preventing empty commit loops.
- **`[skip ci]` in the commit message** — prevents the workflow from triggering itself again after pushing the updated SVG.

## Step 2: Embed in your Profile README

In your `README.md`, add:

```markdown
![Timeline](timeline.svg)
```

Or use the full raw URL for maximum compatibility:

```markdown
![Timeline](https://raw.githubusercontent.com/YOURUSERNAME/YOURUSERNAME/main/timeline.svg)
```

Replace `YOURUSERNAME` with your GitHub username — it appears twice in the URL. The raw URL ensures GitHub renders the SVG as an image rather than showing raw XML.

## Step 3: Push and watch it run

Commit and push both files:

```bash
git add .github/workflows/gitstory.yml README.md
git commit -m "feat: add gitstory timeline"
git push
```

GitHub Actions will pick up the workflow within a minute. Once it finishes, `timeline.svg` appears in your repo and the image renders in your profile README automatically. After that, it re-runs daily at 06:00 UTC.

## Troubleshooting

**Workflow fails with "Permission denied" or push errors**

Go to your repo's **Settings → Actions → General → Workflow permissions** and set it to **Read and write permissions**. The `permissions: contents: write` in the YAML requires this to be enabled at the repo level.

**The token used doesn't have permission**

If you're using a fine-grained personal access token or a custom `GITHUB_TOKEN` override, make sure it has `contents: write` scope for the repo. The default `GITHUB_TOKEN` on a public profile repo works without any changes.

**Timeline is nearly empty or shows only one commit**

You're missing `fetch-depth: 0`. Without it, `actions/checkout@v4` only fetches a shallow clone with a single commit. Add:

```yaml
- uses: actions/checkout@v4
  with:
    fetch-depth: 0
```

**No commits are visible at all**

`bunx gitstory` reads `git log` from the repository root. If the workflow runs in a subdirectory or the path argument is wrong, it may find no history. The `.` argument means "current directory" — make sure the workflow `working-directory` isn't set to a subfolder unintentionally.

---

[gitstory on GitHub](https://github.com/mitosisdev/gitstory)
