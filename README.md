# gstack-flow

*by Sajeed Ahmed*

Three add-ons that make [gstack](https://github.com/garrytan/gstack) easier to live
with day-to-day:

1. **`/flow`** — a one-command conductor for gstack's 7-gate workflow
   (Think → Plan → Build → Review → Test → Ship → Reflect). Drives the gates one at a
   time, pauses for your approval, and **resumes across sessions** via a disk checkpoint.
   You stop memorising 50 command names — just type `/flow`.
2. **`recall/`** — a tiny **repo-local memory** convention. Plain markdown files in your
   repo (decisions, gotchas, a bug log) that auto-load each session via `CLAUDE.md`.
   Git-versioned, zero cost, no database.
3. **Dependency-graph tooling** — generate a visual import graph of your codebase and
   flag circular dependencies, with one script.

> **This is not gstack.** gstack is the engine and does the heavy lifting — install it
> first. This repo only adds the conductor, the memory convention, and the graph helper.

## Requirements
- [Claude Code](https://claude.ai/code)
- [gstack](https://github.com/garrytan/gstack) installed (`~/.claude/skills/gstack`)
- [Bun](https://bun.sh) · Node · Git
- For graphs: `madge` (`bun add -g madge`) + Graphviz (`brew install graphviz`)

## Install
```bash
# 1. the /flow conductor (global, all projects)
mkdir -p ~/.claude/skills/flow
cp skills/flow/SKILL.md ~/.claude/skills/flow/SKILL.md

# 2. the memory convention — copy the template into YOUR repo
cp -r recall /path/to/your-repo/recall
# then add this line near the top of your repo's CLAUDE.md:
#   Then read `recall/INDEX.md` — repo-local memory (decisions, gotchas, learnings).

# 3. dependency graphs (run from your repo root, after editing paths in the script)
cp tools/regen-graphs.sh /path/to/your-repo/recall/graphs/regen.sh
```
Restart Claude Code so `/flow` appears in the `/` palette.

## Usage
```
/flow          resume the pipeline (runs next gate, pauses for approval)
/flow status   show the gate board
/flow next     run the next gate now
/flow goto X   jump to a gate
/flow reset    start a fresh cycle
```

## Credit & license
- **gstack** by Garry Tan — https://github.com/garrytan/gstack (MIT). All the `/`-skills
  this kit orchestrates are gstack's work.
- This starter kit (the `/flow` conductor, the `recall/` convention, the graph helper)
  is MIT-licensed — see [LICENSE](LICENSE).
