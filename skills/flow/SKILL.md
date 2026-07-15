---
name: flow
version: 2.4.1
description: One-command conductor for the product pipeline (Think → Idea Lab → Research → Plan → Build → Review → Test → Support → Ship → Reflect). Adds an adversarial idea council, an iterative research-with-sample gate, and per-feature support docs on top of gstack. Drives gates one at a time, pauses for approval, resumes across sessions. Use when the user types /flow, /flow status, /flow next, /flow reset, or /flow goto <gate>.
allowed-tools:
  - Bash
  - Read
  - Grep
  - Glob
  - Write
  - Edit
  - AskUserQuestion
  - Task
  - WebSearch
---

# /flow — gstack pipeline conductor

You are driving a 9-gate product-development pipeline so the user only has to
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

## The 10 gates

| # | Gate      | Runs                         | Notes |
|---|-----------|------------------------------|-------|
| 1 | think     | gstack `office-hours`        | shape the idea WITH the user |
| 2 | idea-lab  | **inline (this skill)**      | adversarial council challenges the idea |
| 3 | research  | **inline (this skill)**      | iterative; cited brief + product sample; 2 lenses; BLOCKS plan |
| 4 | plan      | gstack `autoplan`            | CEO → design → eng → devx council on the plan |
| 5 | build     | — (MANUAL handoff)           | you + user write the code; bracket only |
| 6 | review    | gstack `review`              | impact analysis: "what could break?" |
| 7 | test      | gstack `qa`                  | browser / comprehension test + regression |
| 8 | support   | **inline (this skill)**      | per-feature support docs (seeds future support agents) |
| 9 | ship      | gstack `ship`                | tests + PR; APPROVAL GATE before commit/push |
| 10| reflect   | gstack `retro` then `learn`  | capture learnings |

- "Runs gstack `<skill>`" = READ `~/.claude/skills/gstack/<skill>/SKILL.md` and execute it.
  Do NOT reimplement gstack skills.
- "inline (this skill)" gates — **idea-lab**, **research**, and **support** — are defined in
  full below; run those procedures directly.

## Product type + roles (capture ONCE, after bootstrap, before idea-lab)

Ensure `state.meta.product_type` and `state.meta.roles` are set. If missing, ask the user
(one AskUserQuestion): which best fits — **engineering/dev-tool · content/teaching · research ·
design/consumer-app · other**. From the answer set the two role lenses `roles = {expert, learner}`:
- content/teaching → expert: domain professor · learner: target student (e.g. "8th grader")
- dev-tool → expert: senior engineer · learner: junior dev
- consumer app → expert: domain expert · learner: real end-user
- other → ask the user to name the two
Store in `state.meta`. These drive Idea Lab's domain/end-user personas AND the Research lenses.

## Idea Lab gate (gate 2) — adversarial idea council

Interrogate the IDEA hard, BEFORE research, so the sharpest objections + unverified assumptions
become the research agenda. **Friendly name, adversarial behavior — keep the teeth.**

Personas — spawn as parallel subagents via `Task` (1 advocate + 5 challengers):
1. **The Innovator** (advocate — the ONLY non-adversarial voice) — argues the core insight,
   "why now", the unique edge; defends what's genuinely new so the council doesn't strip the
   differentiation. Also names the one assumption the idea CANNOT survive being wrong.
2. **Skeptical Investor** — demand, market, willingness to pay. "Who is genuinely upset if this
   vanishes — not 'interested'?"
3. **Domain Expert** (use `meta.roles.expert`) — rigor, correctness; does it respect how the
   field actually works?
4. **Practitioner** — real-world daily usage. "Would I actually use this, and when?"
5. **Rival Builder** — competitive threat / moat. "Here's how I clone it and win."
6. **Confused End-User** (use `meta.roles.learner`) — clarity, onboarding friction. "I don't get it."

Procedure:
1. Give every persona the idea (think / office-hours output).
2. Each returns its single sharpest point (challengers → strongest objection; innovator →
   strongest case + the load-bearing assumption).
3. Synthesize into: **(a) sharpest objections (ranked)** · **(b) unverified assumptions →
   these become the Research questions** · **(c) genuine strengths (what survived)**.
4. **Challenge-mode questions:** when asking the user to react, present objections WITHOUT a
   "(Recommended)" option — make them defend or revise, don't nudge toward agreement.
5. Write `~/.gstack/projects/<slug>/idea-lab.md`; surface durable decisions into `recall/`.

## Research gate (gate 3) — iterative, sampled, two-lens

Verify the idea-lab assumptions against reality AND make the output concrete enough to steer.
**BLOCKS the plan gate until a research brief exists.**

Procedure (ITERATIVE — loop, do NOT one-shot):
1. Turn idea-lab's assumptions into explicit research questions (≥ competitors + domain/expert
   knowledge + market/demand).
2. **Auto-invoke research tools** — `WebSearch`, and gstack `deep-research` if present; gbrain
   if relevant. Don't wait to be asked. If a configured tool is broken (e.g. gbrain CLI
   missing), SAY SO — never fail silent.
3. Each pass produce TWO things:
   a. a **cited research brief** answering the questions, and
   b. a **previewable PRODUCT SAMPLE** — a concrete instance of the real output (sample lesson /
      mock screen / worked example) grounded in the findings. Show, don't tell.
4. Evaluate the sample through the **two lenses**:
   - **Expert** (`meta.roles.expert`): accurate, deep, structurally/pedagogically sound?
   - **Learner** (`meta.roles.learner`): can a zero-prior-knowledge target actually understand it?
5. Refine sample + brief from their critiques. Repeat 3–4 until both lenses pass a good bar or
   the user is satisfied.
6. Before locking: the learner persona is a PROXY — **prompt the user for a real-human
   comprehension check** (the strongest signal). Capture the result.
7. Write `~/.gstack/projects/<slug>/research-brief.md` (cited) + keep the sample; surface key
   findings into `recall/`.

**Blocked transition:** gate 4 (plan) MUST NOT start unless `research-brief.md` exists. If the
user tries to skip ahead, warn and offer to run research first.

## Support gate (gate 8) — per-feature support docs (before Ship)

Before the feature ships, capture the **support knowledge** a human rep — or later an automated
**support agent** — will need. These accumulate into a `support/` knowledge base that seeds
support agents once the product is live. The docs ship *with* the feature.

**Where:** `support/<feature-slug>.md` in the repo (create `support/` on first use) + a
`support/INDEX.md`. Keep the format identical across features — consistency now = a working
support brain later.

**Each doc: frontmatter + six sections**
```
---
feature: <name> · slug: <kebab> · version: <app version> · date: YYYY-MM-DD
status: draft | live · product_type: <from meta>
---
1. What it is        — plain-language, user-facing (what it does, who it's for)
2. How to use it     — the steps a user takes
3. Troubleshooting   — symptom → likely cause → fix   (the support-agent core)
4. FAQs              — the questions a real user asks
5. Limitations       — what it does NOT do / edge cases
6. Escalation        — when to hand to a human + what info to collect
```

**Build it from what the flow already produced (don't invent):**
- **What / How-to** — ground in what was actually built: use the code brain (gbrain) + the plan.
- **Troubleshooting** — MINE it from: bugs surfaced in Test, blast-radius risks from Review,
  gotchas in `recall/`, and the failure modes the Idea Lab personas raised. This is the
  highest-value section — a support agent lives on *symptom → cause → fix*.
- **Product-type aware (G4):** content → learner help + common misconceptions; dev tool →
  API/usage + error messages; consumer app → account / billing / how-to.

**Rules:** one doc per feature; if Ship changes the feature, update the doc so it matches what
actually shipped. Add an `INDEX.md` line; surface anything durable into `recall/` too.

Output: the **seed corpus for a future support agent** — the reason this gate exists.

## Capability routing & repair (G3) — at the START of every gate

Don't let installed capability sit idle (the #1 failure mode). Before running a gate, route
to the tools it needs and flag/repair broken ones — never fail silent.

1. Detect what's available (quick, quiet): `WebSearch` (built-in), gstack `deep-research`,
   `gbrain` (code search), any research MCP (e.g. Perplexity).
2. **Health-check & SAY SO:** if a tool is configured but broken (e.g. `~/.gbrain/config.json`
   exists but `gbrain` not on PATH), tell the user + offer the fix (`/setup-gbrain`). If a tool
   errors, report it — don't pretend it ran.
3. **Gate → tool map** (invoke or offer; don't wait to be asked):
   - think / idea-lab → `WebSearch` to fact-check claims on the spot
   - research → `WebSearch` + `deep-research` (+ research MCP if present) — REQUIRED here
   - plan → `gbrain code-def`/`code-refs` to ground architecture in the real codebase
   - build → `gbrain` search BEFORE writing (find existing code to reuse — DRY)
   - review → `gbrain code-callers`/`code-callees` to trace blast radius
   - test → the product-type tool (browser for code; none for content — see gate-sets)
4. State in one line which tools you used/offered, so routing is visible.

## Code brain (gbrain) — auto-configured per project

gstack-flow sets up a **local, free code-search brain for each project automatically** — the
same "no setup" philosophy as `recall/`. The brain powers "jump to the right file",
find-references, and blast-radius tracing in the code-aware gates (plan / build / review).

**When:** lazily — the first time you reach a code-aware gate (plan / build / review) AND code
exists in the repo. Don't index an empty repo during think / idea-lab / research.

**Steps (once per project, then keep fresh):**
1. **CLI check.** If `gbrain` is not on PATH → tell the user ONCE and offer gstack's
   `/setup-gbrain` (installs it, ~30s). Then skip brain use gracefully — never block a gate on
   a missing brain.
2. **Brain check.** If no brain exists yet (`~/.gbrain` absent), init a free local one:
   `gbrain init --pglite` (no API key, no cloud).
3. **Register this project** if it isn't a source yet: `gbrain sources add <slug> --path "$PWD"`
   (slug = basename of cwd).
4. **Index the code:** `gbrain sync --source <slug> --strategy code && gbrain extract --stale`.
5. **Keep fresh:** before each later code-aware gate, if code changed since the last sync,
   re-run step 4 (sync is incremental and fast).

**Repair, don't fail silent (per G3):** if `~/.gbrain/config.json` exists but the CLI is
missing, or a sync errors — SAY SO and offer the fix. Never pretend the brain ran.

Record `state.meta.gbrain` = `"ready"` | `"offered"` (CLI missing, user hasn't installed) |
`"skipped"` so the board can show brain status.

## Product-type gate-sets (G4)

`meta.product_type` adapts not just the roles but what **review** and **test** MEAN. Apply the
matching variant when you reach those gates (other gates are stable across types):

| product_type         | review =                              | test =                                                |
|----------------------|---------------------------------------|-------------------------------------------------------|
| engineering/dev-tool | impact analysis — gstack `review`     | browser/unit QA — gstack `qa`                         |
| content/teaching     | factual accuracy + pedagogy review    | comprehension test (real human + learner lens) + expert sign-off |
| research             | methodology + source-quality review   | replication / "can someone follow it?" check          |
| design/consumer      | heuristic + accessibility review      | usability test with a representative user             |

For non-engineering types, do NOT force Playwright/`/qa` — run the variant (usually a structured
human/persona review, not code execution). Engineering type = the original gstack gates unchanged.

## Build gate sub-structure (G5)

Build is where most work happens — give it a spine instead of going dark.

On entering build:
1. Derive a **milestone list** from the plan + research brief (3–7 concrete, testable chunks).
   Write it to `~/.gstack/projects/<slug>/build-plan.md` and show it.
2. Work milestone by milestone. After EACH milestone:
   - quick **inline review** ("here's what we built — does it match the plan?"),
   - **checkpoint:** tick it in build-plan.md (offer a commit, with approval),
   - **scope check:** if work drifts beyond the locked plan, flag it ("this is beyond v1 —
     continue or defer?") — never silently expand.
3. **Cross-session:** if not all milestones are done when a work session ends, leave build
   `in_progress` with build-plan.md updated; next `/flow` resumes at the first un-ticked milestone.
4. When all milestones are ticked (or the user says done), mark build done.

Still hands-on (you + Claude write the code) — but with a visible checklist, per-milestone
review, and scope tracking, not a black hole.

## Cost & scope surfacing (G8)

Two awareness guardrails so fan-out and scope don't drift silently.

- **Cost on fan-out:** before spawning parallel subagents (idea-lab's 6 personas, parallel
  research threads, multiple build agents), state a rough cost up front —
  "spawning N agents (~roughly small / medium / large token cost)" — and note that parallel
  isn't always worth it (use it for genuinely independent work; skip for quick or sequential
  tasks). For large fan-outs (≥ 4 heavy agents), ask the user to confirm before spending.
- **Scope vs the locked plan:** the plan gate + research brief define the agreed scope (e.g. a
  "v1 seed lesson"). At ANY later gate, if proposed work exceeds that, flag it explicitly —
  "this is beyond the locked v1 (<what>) — continue, or defer to a backlog item?" Never
  silently expand. (G5's build scope-check is the build-gate instance; G8 generalizes it to
  every gate.)

## State / checkpoint

- Slug = `basename "$PWD"`.
- State file = `~/.gstack/projects/<slug>/flow-state.json`.
- Shape:
  ```json
  {
    "slug": "my-project",
    "created": "...",
    "updated": "...",
    "current": "research",
    "meta": {
      "product_type": "content/teaching",
      "roles": { "expert": "AI professor", "learner": "8th grader" },
      "gbrain": "ready"
    },
    "gates": {
      "think":    {"status": "done",        "at": "..."},
      "idea-lab": {"status": "done",        "at": "..."},
      "research": {"status": "in_progress", "at": "..."},
      "plan":     {"status": "pending"},
      "build":    {"status": "pending"},
      "review":   {"status": "pending"},
      "test":     {"status": "pending"},
      "support":  {"status": "pending"},
      "ship":     {"status": "pending"},
      "reflect":  {"status": "pending"}
    }
  }
  ```
- Statuses: `pending` ⚪ · `in_progress` 🔵 · `done` ✅ · `skipped` ⏭.
- Always `mkdir -p ~/.gstack/projects/<slug>` before writing. Use `date -u +%FT%TZ`
  for timestamps. Read the file with `Read`; write it with `Write` (full JSON).
- **Migrate on read (forward-compat).** Canonical gate order:
  `think · idea-lab · research · plan · build · review · test · support · ship · reflect`.
  When you read an EXISTING state, for any canonical gate missing from `state.gates`, insert it
  as `{"status":"pending"}` in canonical order; add `meta.gbrain` if absent. Then write the
  migrated state back. This is how projects created by an older `/flow` automatically gain new
  gates (e.g. `support`) — the user never has to reset.

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

1. Resolve slug, read or create state (**migrate old state** — insert missing canonical gates
   like `support`; see State/checkpoint), print the board (see format below).
2. Ensure `meta.product_type` + `meta.roles` exist (capture once — see that section above).
3. Pick the target gate = `current` if `in_progress`, else first `pending`.
4. If all gates are `done` → congratulate, suggest `/flow reset` for a new cycle, stop.
5. Announce: "Gate N/10 — <gate>." Set that gate to `in_progress`, write state.
6. **Capability routing (G3):** route to + repair this gate's tools (see "Capability routing &
   repair"). State in one line what you used/offered. For code-aware gates (plan / build /
   review), also **auto-configure the project's code brain** (see "Code brain — auto-configured
   per project") the first time code exists.
7. **Dispatch by gate:**
   - `think`, `plan`, `ship` → READ the mapped gstack SKILL.md and run it.
   - `review`, `test` → run the **product-type variant** (see "Product-type gate-sets"):
     engineering = gstack `review`/`qa`; other types = that type's variant (don't force `/qa`).
   - `reflect` → run gstack `retro` then `learn`.
   - `idea-lab`, `research`, `support` → run the inline procedures above (no gstack skill).
   - `build` → run the **Build sub-structure** (milestones + per-milestone review + scope
     check; brackets across sessions).
8. **Blocked transitions (enforce):**
   - `plan` must NOT start unless `~/.gstack/projects/<slug>/research-brief.md` exists →
     else warn and offer to run `research` first.
   - `ship` is the APPROVAL GATE: before any commit/push, show a concise diff summary +
     impact, then AskUserQuestion for explicit approval. Never commit/push without it.
9. On completion, mark the gate `done` with timestamp, set `current` to the next pending
   gate, write state.
10. **Gate-boundary memory (G7):** before moving on, capture lightweight "what changed · why ·
    is it durable?" — if durable, write `recall/NNNN-<slug>.md` + add its INDEX line. Don't
    wait for reflect; mid-stream insights get lost otherwise.
11. AskUserQuestion: "✅ <gate> done. Approve and continue to <next>?" — options
    [Continue, Stop here, Redo <gate>]. Honor the answer.

## Board format (always render at the top)

```
flow · <slug> · type: <product-type> · brain: <ready | —>
1.think ✅  2.idea-lab ✅  3.research 🔵  4.plan ⚪  5.build ⚪  6.review ⚪  7.test ⚪  8.support ⚪  9.ship ⚪  10.reflect ⚪
next: research  ·  artifacts in ~/.gstack/projects/<slug>/
```

## Rules

- Never skip a gate silently. If a downstream gate's prerequisite artifact is missing
  (e.g. no plan before review), warn the user and offer to run the missing gate first.
- One gate per turn unless the user says "run everything" — then chain but still pause
  at the ship approval gate.
- If gstack is not installed (`~/.claude/skills/gstack` missing), tell the user to
  install it; do not attempt the gates.
- Surface rough cost before any parallel fan-out, and flag scope creep vs the locked plan
  (see "Cost & scope surfacing").
- Keep the user in control. You nag and track; you do not bulldoze.
