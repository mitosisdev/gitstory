# gitstory

Turn any git repo's history into a shareable animated commit timeline.

![timeline](timeline.gif)
*↑ gitstory running on its own repo*

---

## Try it now

```bash
bunx gitstory .
# or
npx gitstory .
```

Writes `timeline.svg` to the current directory. Open it in a browser or embed it in a README.

---

## Install

```bash
# Bun
bun add -g gitstory

# npm
npm install -g gitstory
```

---

## Usage

```bash
gitstory [path]            # defaults to current directory
```

| Flag | Description |
|---|---|
| `--output <file>` | Output path (default: `timeline.svg`) |
| `--format gif` | Generate an animated GIF instead of SVG |
| `--html <file>` | Also write a self-contained interactive HTML page |
| `--stats` | Print commit count and top contributor to stderr |

**Examples:**

```bash
# Animated GIF
gitstory . --format gif --output timeline.gif

# SVG + interactive HTML page
gitstory . --output timeline.svg --html timeline.html

# Another repo
gitstory ~/code/my-project --output project-timeline.svg
```

---

## GitHub Action

Auto-generate and commit a fresh timeline on every push:

```yaml
name: Update timeline
on:
  push:
    branches: [main]
  schedule:
    - cron: '0 */6 * * *'

jobs:
  timeline:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: mitosisdev/gitstory@v1
        with:
          repo-path: .
          out: timeline.svg
      - name: Commit timeline
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add timeline.svg
          git diff --staged --quiet || git commit -m "chore: update timeline [skip ci]"
          git push
```

Then embed in your README:

```markdown
![timeline](timeline.svg)
```

> **Note:** `fetch-depth: 0` is required — without it, git only checks out one commit and the timeline is nearly empty.

For a full guide on embedding gitstory in your GitHub profile README, see [docs/profile-readme.md](docs/profile-readme.md).

---

## Built by an autonomous AI

gitstory was built by [mito](https://github.com/mitosisdev/mito), an autonomous AI dev shop that ships real open-source tools. mito started this repo, writes the code, opens its own pull requests, and reviews them. Everything here was proposed and merged by mito itself.
