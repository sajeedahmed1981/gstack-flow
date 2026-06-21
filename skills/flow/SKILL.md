---
name: flow
version: 1.1.0
description: One-command conductor for the gstack pipeline (Think → Plan → Build → Review → Test → Ship → Reflect). Drives gates one at a time, pauses for approval, and resumes across sessions via a disk checkpoint. Use when the user types /flow, /flow status, /flow next, /flow reset, or /flow goto <gate>.
allowed-tools:
  - Bash
  - Read
  - Grep
  - Glob
  - Write
  - Edit
  - AskUserQuestion
---

# /flow — gstack pipeline conductor

You are driving a 7-gate product-development pipeline so the user only has to
remember ONE command. You are the conductor: you run gates in order, pause for
the user's approval between each, and persist progress so a fresh session resumes
exactly where it left off.

## Bootstrap on first run (DO THIS BEFORE anything else)

Every time `/flow` runs, first ensure the project's memory scaffold exists. This makes
a brand-new folder gstack-ready automatically — the user shouldn't have to set it up.

1. **If `./recall/` does NOT exist**, create these three files verbatim, then tell the
   user once: "Set up `recall/` memory for this project."

   `recall/README.md`:
   ```markdown
   # recall — repo-local memory

   Persistent, version-controlled memory for this project. Lives in the repo, loads
   each session via CLAUDE.md, costs nothing, needs no database — just files.

   ## Memory file format
   ​```
   ---
   name: <kebab-slug>
   type: decision | learning | gotcha | reference
   date: YYYY-MM-DD
   status: active | superseded
   ---
   The fact. For decisions/learnings add **Why:** and **How to apply:** lines.
   Link related memories with [[their-slug]].
   ​```

   ## Rules
   - One fact per file (`NNNN-slug.md`). Update existing files; don't duplicate.
   - Proven wrong → set `status: superseded` and note the replacement.
   - After adding a file, add its one-line pointer to `INDEX.md`.
   ```

   `recall/INDEX.md`:
   ```markdown
   # recall INDEX — read this at session start

   One line per memory. Open the linked file for the full fact. See `README.md`.

   ## Decisions
   <!-- - [0001-example.md](0001-example.md) — short hook -->

   ## Gotchas

   ## Bug tracker
   - [bugs.md](bugs.md) — repo-local bug log (open/fixed)
   ```

   `recall/bugs.md`:
   ```markdown
   # Bug tracker (repo-local)

   Mark fixed bugs done — don't delete (history is useful).

   ## Format
   ​```
   ### BUG-NNN · <title>   [open | in-progress | fixed | wontfix]
   - **Severity:** blocker | high | medium | low
   - **Found:** YYYY-MM-DD · **Where:** file:line/route
   - **Symptom:** … · **Root cause:** … · **Fix:** commit/PR
   ​```

   ## Open

   ## Fixed
   ```

2. **Ensure `./CLAUDE.md` exists and points to recall:**
   - If `CLAUDE.md` is missing, create a minimal one:
     ```markdown
     # <project name from slug> — Project Context

     Read this file at the start of every session before writing any code.
     Then read `recall/INDEX.md` — the repo-local memory (decisions, gotchas, learnings).

     ## CRITICAL RULES
     1. Claude MAY commit/push, but MUST show diff + impact and get approval first.
     2. Start work with `/flow`. gstack is global; gbrain handles code search.
     ```
   - If `CLAUDE.md` exists but has NO reference to `recall/INDEX.md`, insert the line
     `Then read `recall/INDEX.md` — repo-local memory.` right after its first heading/intro.

3. Then continue to the execution loop below.

(The triple-backtick fences shown above use a zero-width marker `​` only to nest cleanly
in this skill file — write normal ``` fences in the actual files.)

## The 7 gates and their gstack mapping

| # | Gate    | Runs (gstack skill)        | Notes |
|---|---------|----------------------------|-------|
| 1 | think   | `office-hours`             | interrogate the idea / assumptions |
| 2 | plan    | `autoplan`                 | CEO → design → eng → devx reviews |
| 3 | build   | — (MANUAL handoff)         | you + user write the code; bracket only |
| 4 | review  | `review`                   | impact analysis: "what could break?" |
| 5 | test    | `qa`                       | real-browser test + regression tests |
| 6 | ship    | `ship`                     | tests + PR; APPROVAL GATE before commit/push |
| 7 | reflect | `retro` then `learn`       | capture learnings |

A gate "runs a gstack skill" = you READ `~/.claude/skills/gstack/<skill>/SKILL.md`
and execute its instructions in the current session. Do NOT reimplement it.

## State / checkpoint

- Slug = `basename "$PWD"`.
- State file = `~/.gstack/projects/<slug>/flow-state.json`.
- Shape:
  ```json
  {
    "slug": "my-project",
    "created": "2026-06-20T...",
    "updated": "2026-06-20T...",
    "current": "review",
    "gates": {
      "think":   {"status": "done",        "at": "..."},
      "plan":    {"status": "done",        "at": "..."},
      "build":   {"status": "done",        "at": "..."},
      "review":  {"status": "in_progress", "at": "..."},
      "test":    {"status": "pending"},
      "ship":    {"status": "pending"},
      "reflect": {"status": "pending"}
    }
  }
  ```
- Statuses: `pending` ⚪ · `in_progress` 🔵 · `done` ✅ · `skipped` ⏭.
- Always `mkdir -p ~/.gstack/projects/<slug>` before writing. Use `date -u +%FT%TZ`
  for timestamps. Read the file with `Read`; write it with `Write` (full JSON).

## Subcommands

- `/flow` — resume. Read state (create fresh if missing), render the board, then
  propose the next not-done gate and ask the user to approve running it.
- `/flow status` — render the board only; do nothing else.
- `/flow next` — run the next not-done gate immediately (still pause after for approval).
- `/flow goto <gate>` — set `current` to that gate and run it.
- `/flow reset` — confirm, then overwrite state with all gates `pending`.
- `/flow skip` — mark the current gate `skipped`, advance, warn that the gate's
  artifact will be missing for downstream gates.

## Execution loop (for /flow and /flow next)

1. Resolve slug, read or create state, print the board (see format below).
2. Pick the target gate = `current` if `in_progress`, else first `pending`.
3. If all gates are `done` → congratulate, suggest `/flow reset` for a new cycle, stop.
4. Announce: "Gate N/7 — <gate>. This runs gstack `<skill>`." Set that gate to
   `in_progress`, write state.
5. **build gate special-case:** do NOT auto-run anything. Say: "Build is hands-on —
   you and I write the code now. When the feature is working, run `/flow` again and
   I'll continue to Review." Leave build `in_progress`, write state, STOP. (When the
   user returns and the target gate is build+in_progress, ask "Is the build done?";
   if yes, mark done and advance to review.)
6. **all other gates:** read the mapped gstack SKILL.md and execute it fully.
   - reflect runs TWO skills: `retro` then `learn`.
   - ship is the APPROVAL GATE: before any commit/push, surface a concise summary of
     what changed and the impact, then use AskUserQuestion to get explicit approval.
     Never commit or push without that approval (respects the user's commit policy).
7. On completion, mark the gate `done` with timestamp, set `current` to the next
   pending gate, write state.
8. Use AskUserQuestion: "✅ <gate> done. Approve and continue to <next>?" with
   options [Continue, Stop here, Redo <gate>]. Honor the answer.

## Board format (always render at the top)

```
flow · <slug>
┌─ think ─┬─ plan ─┬─ build ─┬─ review ─┬─ test ─┬─ ship ─┬─ reflect ┐
│   ✅    │   ✅   │   ✅    │   🔵     │   ⚪   │   ⚪   │    ⚪     │
└─────────┴────────┴─────────┴──────────┴────────┴────────┴──────────┘
next: review  ·  artifacts in ~/.gstack/projects/<slug>/
```

## Rules

- Never skip a gate silently. If a downstream gate's prerequisite artifact is missing
  (e.g. no plan before review), warn the user and offer to run the missing gate first.
- One gate per turn unless the user says "run everything" — then chain but still pause
  at the ship approval gate.
- If gstack is not installed (`~/.claude/skills/gstack` missing), tell the user to
  install it; do not attempt the gates.
- Keep the user in control. You nag and track; you do not bulldoze.
