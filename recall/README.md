# recall — repo-local memory

Persistent, version-controlled memory for your project. Lives **in the repo** so it
travels with the code, survives across Claude Code sessions, and any machine gets it
on `git clone`. No database, no cloud, no API key — just files.

## How it works
- `INDEX.md` is the loaded index — one line per memory. Tell Claude to read it at
  session start (add a pointer in `CLAUDE.md`), so every session starts with context.
- Each memory is one `NNNN-slug.md` file with frontmatter + the fact in the body.

## Memory file format
```markdown
---
name: <kebab-slug>
type: decision | learning | gotcha | reference
date: YYYY-MM-DD
status: active | superseded
---

The fact. For decisions/learnings add **Why:** and **How to apply:** lines.
Link related memories with [[their-slug]].
```

## Rules
- One fact per file. Update the existing file rather than duplicating.
- When something is proven wrong, set `status: superseded` and note what replaced it.
- After adding a file, add its one-line pointer to `INDEX.md`.
