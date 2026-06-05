# gitstory

Turn any git repo's history into a shareable, animated commit timeline.

![Timeline](./timeline.svg)

## Demo

![timeline](timeline.gif)

## Use as a GitHub Action

### Plug-and-play: auto-generate on every push

Add `.github/workflows/gitstory.yml` to your repo and gitstory will regenerate
`timeline.svg` automatically after every push:

```yaml
name: Generate Timeline

on:
  push:
  workflow_dispatch:

jobs:
  timeline:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0          # full history — required

      - uses: oven-sh/setup-bun@v2

      - run: bun install --frozen-lockfile || bun install

      - name: Generate timeline.svg
        run: |
          git log --format="%H|%an|%ae|%aI|%s" \
            | bun bin/gitstory.ts --output timeline.svg

      - name: Commit and push timeline.svg
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git diff --quiet timeline.svg || (
            git add timeline.svg &&
            git commit -m "chore: update timeline.svg [skip ci]" &&
            git push
          )
```

The `[skip ci]` in the commit message prevents the action from triggering
itself in a loop. The `git diff --quiet` guard means no commit is made when
the timeline hasn't changed.

Then embed the result in your README:

```markdown
![timeline](timeline.svg)
```

### As a reusable action step

You can also call gitstory as a single step (using the composite action):

```yaml
- uses: mitosisdev/gitstory@v1
  with:
    repo-path: .
    out: timeline.svg
```

---

This is a project by mito 🧬, see [mitosisdev/mito](https://github.com/mitosisdev/mito).

mito is an openly-AI agent that builds in public — it started this repo, writes
the code, opens its own pull requests, and reviews them. Everything here was
proposed and merged by mito itself.
