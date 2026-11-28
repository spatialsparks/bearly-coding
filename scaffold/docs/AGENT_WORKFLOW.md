# Agent workflow

How work is written down and closed on this project. `docs/PLANNING.md` covers how it gets onto
the board, and `docs/ORCHESTRATION.md` how it moves from the board to `main` — by hand with
`/implement`, or by itself with `/autopilot`; this file covers what a sprint, a story and a
wave are.

## Three words

| Word | What it is | On disk |
| --- | --- | --- |
| **Sprint** `S-012` | One outcome the owner asked for, planned in one sitting: a spec and the stories that build it. Reviewed as a whole, and pushed and deployed only when it is finished | a folder, `docs/board/sprints/S-012-share-links/` |
| **Story** `S-012.3` | One piece of a sprint: one agent, one fresh context, one commit | a file in that folder |
| **Wave** | The stories built at once: the ready ones that are provably independent, at most `max_parallel` | a file in `docs/board/log/`, once it is verified |

On autopilot two agents share the orchestrating (ADR-0013). The **orchestrator** is the session
`/autopilot` was typed in: it builds nothing, and starts one **sprint lead** after another. A
sprint lead is a sub-agent with a fresh context that carries one sprint from the board to
`main` — it is the one that plans the waves, starts the agents, and writes the board.

## Context levels

Read down this list and **stop when you know enough**. Never scan the repository.

| Level | File | Read |
| --- | --- | --- |
| L0 | `CLAUDE.md` | every session |
| L1 | `docs/PROGRESS.md`, `docs/board/BOARD.md`, `docs/GLOSSARY.md` | every session; the board's Done table keeps 20 rows |
| L2 | the `CLAUDE.md` of the directory you are in | with every file read there |
| L3 | your sprint's `sprint.md`, then your story | on demand |
| L4 | `docs/ARCHITECTURE.md`, `docs/FEATURES.md`, `docs/STORAGE_FORMAT.md`, `docs/adr/`, `docs/PRIME_DIRECTIVES.md` | on demand |

If you find yourself reading L4 for an ordinary story, the story is underspecified — fix the
story, not just your own understanding.

No context file has a line limit. Write each one as precise and short as possible, with only
what is necessary: L0 to L2 are read whole, so every line is paid for on every read.

`docs/CODING_STANDARDS.md` is on no level: reviewers read it, implementers do not (ADR-0011).

## The board

```
docs/board/
  BOARD.md               status and order: the sprints, In wave, Ready, Blocked, Backlog, Done
  LATER.md               the parking lot, and what was decided against and why
  _TEMPLATE-sprint.md    copy for a new sprint's spec
  _TEMPLATE-story.md     copy for a new story
  _TEMPLATE-input.md     copy for a new input
  inbox/                 single stories, waiting for the sprint lead to number and file them
  inputs/                what waits on the owner, one file each; done/ once it is applied
  log/                   the history: one file per verified wave, written once
    phase-0.md
    wave-0012.md
  sprints/               every sprint, one folder each
    S-000-maintenance/   the standing sprint: bugs, debt, dependency bumps, tooling
      sprint.md
    S-012-share-links/
      sprint.md          the spec
      S-012.1-share-port.md
      S-012.2-share-dialog.md
      review.md          what the two reviewers found, written before the sprint lands
      retro.md           what /retro took out of the sprint, and where it put it
    done/                sprints that are finished and have had their retro
```

**Ids.** Sprints are `S-NNN`; stories are `S-NNN.N` — the sprint's number, then the story's. Two
planning sessions working at once can never hand out the same story id, and every id says which
sprint it serves. A story in `inbox/` has no number yet: the sprint lead gives it one when it
files it, so a planning session and a running wave never hand out the same one either. Inputs
are `I-NNN`, numbered in order by whoever is building.

**Writers.** Planning sessions create sprint folders with their stories, and single stories in
`inbox/`; they add terms to `docs/GLOSSARY.md`, entries to `LATER.md` and proposed ADRs
(`docs/PLANNING.md`). Only whoever is building writes `BOARD.md`, the files in `log/`, a
sprint's `review.md` and a story's **History** section: the sprint lead while `/autopilot`
runs, and otherwise the session of `/implement`, whose changes the owner commits. Status lives
in `BOARD.md` alone — never in a story — so a story never goes stale. The same builder writes
the files in `inputs/`, one for each thing only the owner can give; the owner writes the
answer into them, through `/resolve` or by hand, and nothing else (`docs/board/inputs/README.md`).

**Names the inspector reads.** In `BOARD.md`, the frontmatter keys, the `**Now:**` line and the
section headings — Sprints, In wave, Ready, Blocked, Backlog, Done — with the headers of their
columns. In a file of `log/`, the first heading, `# Wave N · sprint · date · result`, and its
`**Stories**` line of ids marked ✓ or ✗. In `PROGRESS.md`, the `status` field and the "Blocked
on the owner" heading. Keep those as they are; everything else may be reworded (ADR-0006).

## Sprints

A sprint is **one outcome the owner could see working**, and its `sprint.md` is the spec: why
it is wanted, what it delivers, its behaviour, its states and edge cases, its rules, what was
decided, where it is tested, its acceptance criteria, and what it is not. It is written before
any of its stories run — by a planning session with the owner (`/feature`, `/refactor`) or,
in Phase 0, by the kickoff. Describe what the thing does, not how it is built;
the how is the stories' job. Use the words of `docs/GLOSSARY.md`.

A sprint that needs two unrelated behaviour tables, or more than about eight stories, is two
sprints. Pure plumbing — a migration, a tooling change, a refactoring — is a technical sprint
and needs no behaviour section: say "no behaviour changes" rather than writing a spec nobody
reads. A single bug or chore is no sprint at all: it is a story in `inbox/`, filed under
`S-000`.

A sprint's status is one of `planned`, `in progress`, `waiting` — it cannot finish without
the owner —, `reviewed` — finished and read, not yet on `main` —, `landed` — on `main`, pushed
and deployed by `/autopilot` — or `built` — every story done by hand, the rest the owner's —,
`done`, `dropped`, and `standing` for `S-000`. `docs/board/BOARD.md` says what each means. A
sprint that is `done` lives in `docs/board/sprints/done/` and has left the board's table.

## Stories

One file per story, `docs/board/sprints/S-NNN-slug/S-NNN.N-slug.md`, in the shape of
`docs/board/_TEMPLATE-story.md`:

```md
# S-NNN.N — Title

**Sprint** S-NNN · **Kind** feat/fix/refactor/chore · **Depends on** ids, or none ·
**Solo** yes/no · **Model** opus/sonnet
**Goal** one sentence: the behaviour this story makes work.
**Read** the functions or sections this story needs, file by file, in order — not just files.
**Owned paths** globs this story may create and edit — shared files included.
**Forbidden paths** globs it must not touch.
**Do** the three to six things that make up the story.
**Verify** {{VERIFY_FAST}} — the sprint lead runs {{VERIFY_COMMAND}} once, on the whole wave.
**Acceptance criteria** a list a reviewer can tick.
**Done when** the sentence that closes the story.
## History (sprint lead only)
```

A bug's story also says, under its goal, what happens **Now**, what **Should** happen, and the
one command that **Reproduces** it.

A story is one agent's work in one session, and it becomes one commit: one slice, one module or
one concern. If it needs two, it is two stories. If it cannot be described without "and then",
it is two stories. Write the story **before** the code, so an agent that has read nothing else
can execute it — that is the test of whether it is really cold-startable. Every story leaves
the product working, with both gates green.

## Slicing a sprint into stories

- **A slice, not a layer.** A story cuts a narrow but complete path through every layer it
  needs — the rule in the domain, the use case, the adapter, the view — so that when it is in,
  something can be seen or checked. "All the types", then "all the handlers", is the wrong cut.
- **Contract first, then fan out.** A change to a contract — a port, a shared type, the storage
  format, the public surface of a shared module — is a **Solo** story of its own, with the
  memory fake and the contract suite, and goes first. The stories that build on it come after,
  with disjoint owned paths, so they can share a wave.
- **Make the change easy, then make the easy change.** If the code is in the way, the
  restructuring is a story of its own, first, with the tests that hold today's behaviour.
- **A wide mechanical change goes in three steps.** Renaming a shared symbol or retyping a
  column breaks every caller at once, and no slice can land green. Expand: add the new form
  beside the old. Migrate the callers in batches by directory, one story each. Contract: delete
  the old form in a last story that depends on every batch.
- A sprint that is one long chain of dependent stories is honest — it just runs one story per
  wave.

## Definition of ready

The sprint lead moves a story into Ready only when:

- its sprint exists, and no open question in `sprint.md` blocks it;
- **Goal**, **Owned paths**, **Verify**, **Acceptance criteria** and **Done when** are filled in;
- every id in **Depends on** exists;
- **Kind**, **Solo** and **Model** are set.

Anything else waits in Backlog, with a line saying what it lacks.

## Owned paths and parallel work

Owned paths are two things at once: the story's blast radius, and **the key the sprint lead
schedules by**. Two stories whose owned paths overlap never share a wave (directive 29).

- **Shared files are owned paths too.** List the manifest and lockfile if the story adds a
  dependency, the composition root if it wires something, a registry if it adds an entry, the
  migrations folder, and the `CLAUDE.md` of any directory whose public surface it changes. The
  scheduler then serializes it against everything else that touches them — there is no other
  mechanism, so an unlisted shared file is a collision waiting to happen.
- **Solo: yes** for a contract change: a port, a shared type, the storage format, the public
  surface of a shared module, or the dependency ledger in ADR-0003. A solo story runs alone.
- **Always forbidden** to a story: `docs/board/BOARD.md`, `docs/board/log/`, `docs/PROGRESS.md`,
  the root `CLAUDE.md`, and numbered ADRs. The sprint lead owns them.

## Two verify tiers

| Command | Runs | Who runs it |
| --- | --- | --- |
| `{{VERIFY_FAST}}` | typecheck, lint, the architecture check, unit tests. No ports, servers, containers or emulators, so any number can run at once | every agent, inside its worktree |
| `{{VERIFY_COMMAND}}` | the fast verify, then the contract suites against local emulators, the build and the end-to-end tests | only the sprint lead, once per wave, on the sprint branch with every story of the wave committed — and again only after a fix |

If the project's full verify needs no ports, servers or emulators, the two can be the same
command. Never make either green by weakening it (directive 15). Neither runs on GitHub:
there is no CI (ADR-0007, ADR-0009). The one other check is TruffleHog, in the git hooks of
`.githooks/`, on every commit and every push.

## What gets a test

Directive 14, as a table. A test costs tokens to write and time in every verify from then on, so
tests go where a mistake is likely and a test is cheap.

| Code | Its test |
| --- | --- |
| A rule, calculation or decision in `{{LAYER_DOMAIN}}` or `{{LAYER_APPLICATION}}` | one that fails if it breaks — no I/O, memory fakes only |
| A port | its contract suite, run by the fake and by the real implementation (directive 7) |
| Wiring, pass-through adapter code, views, configuration | none of its own |
| A sprint | one end-to-end test of its main path, on the story that completes it — not one per story |
| A bug | the test that fails while the bug is there, written before the fix |

**Test first.** For everything in this table the test is written before the code: one test,
watch it fail, the least code that makes it pass, then the next. Never all the tests and then
all the code — tests written in bulk check what was imagined, not what was built. The expected
value comes from the story or the spec, never from running the code. Tests go through a public
interface, so they survive a restructuring that changes no behaviour.

A story that needs more than this says so in its acceptance criteria. Tests that already exist
stay: this is about what gets written, and directive 15 still forbids deleting one to get to
green.

## Branches

These are `/autopilot`'s. A story built by hand, with `/implement`, has no branch of its
own: it is built on whatever branch the owner has checked out, and the owner commits it.

- **`story/S-NNN.N-slug`** — one per story, in the agent's own worktree, cut from the sprint
  branch. Committed, never pushed. The sprint lead brings it into the sprint branch as one
  commit.
- **`sprint/S-NNN`** — cut from `main` by the sprint lead when it starts a sprint, and local:
  nothing on it is pushed before every sprint on it is reviewed and finished. It holds one
  commit per story — `feat: the dialog copies the link (S-012.2)` — and the sprint lead's
  records. A sprint that gets stuck stays on it, and the next one is built on top, so the
  branch keeps the name of the sprint that opened it. It is the lock while anything on it is
  in flight, and it is deleted when it lands.
- **`plan/<slug>`** — a planning session's branch: a new sprint folder, a story in the inbox, a
  term, a retro, and nothing a sprint touches. Made in a worktree of the planning session's own,
  never by switching branches in the main checkout, and pushed as a backup. The sprint lead
  merges it into `main` at its next wave planning (`docs/PLANNING.md`).
- **`prototype/<slug>`** — throwaway code that answered a design question. Never merged.
- **`main`** — on autopilot, written by the sprint lead alone: the merged plan branches, and
  one merge commit per landing, `feat: share links (S-012)`, with the stories behind it. Pushed
  and deployed when it lands. By hand, the owner commits there or merges into it; no session
  does. Never a force push, never `--no-verify`. There are no pull requests (ADR-0009).

## Decisions

A story that makes a decision its file did not fix writes it to
`docs/adr/proposed/<story-id>-<slug>.md`, in the ADR format. The sprint lead numbers and moves
it when the wave is recorded, so two agents never both write `ADR-0014`. A new dependency is
always a solo story, because it edits the ledger in ADR-0003, the manifest and the lockfile.

A decision earns an ADR only when it is hard to reverse, surprising without its context, and
the result of a real trade-off (`docs/PLANNING.md`). Anything less is a line under Decisions in
`sprint.md`.

## Checklists

### A story — the implementer, or the session building it by hand, before it reports

- [ ] `{{VERIFY_FAST}}` green
- [ ] Only the story's owned paths changed
- [ ] Tests for the logic the story added — domain, use cases, a port's contract — each written
      first and failing if that logic breaks, and none beyond what directive 14 asks for
- [ ] Names in code, tests and messages use the words of `docs/GLOSSARY.md`
- [ ] The directory `CLAUDE.md` updated wherever a public surface changed
- [ ] A proposed ADR for any decision the story did not already fix
- [ ] Nothing in the diff looks like a key, token, password or `.env`
- [ ] On autopilot: committed on `story/<id>-<slug>`, with the pre-commit hook on; not pushed.
      By hand: nothing committed, and a commit message proposed that closes with the story's
      id

### A wave — the sprint lead, before it records it

- [ ] Every story in it is one commit on the sprint branch that names its id, or is returned or
      blocked with a line in its History
- [ ] `{{VERIFY_COMMAND}}` is green on the sprint branch as it stands
- [ ] The verifier's verdict on every `opus` story in the wave is pass, or pass with its debt
      recorded
- [ ] Every story stayed inside its owned paths
- [ ] `BOARD.md` shows every story's outcome
- [ ] `docs/board/log/wave-NNNN.md` written, with its **Contexts** lines from
      `tools/context-report.mjs`
- [ ] `docs/PROGRESS.md` matches reality; proposed ADRs numbered and moved into `docs/adr/`
- [ ] A new dependency has its row in the ledger of `docs/adr/ADR-0003-dependencies.md`

### A sprint — the sprint lead, before it pushes

- [ ] Every story is done, and the acceptance criteria of `sprint.md` hold
- [ ] Both reviewers have read the whole sprint, and `review.md` holds what they found
- [ ] Every must-fix finding is fixed and was checked again
- [ ] `{{VERIFY_COMMAND}}` was green on the commit that lands
- [ ] `BOARD.md` and `docs/PROGRESS.md` say the sprint has landed, and the `**Now:**` line is
      rewritten
- [ ] Nothing in the sprint's diff looks like a key, token, password or `.env`

## Token hygiene

Terse test reporters. No log dumps in a commit message or a report. No
generated documentation indexes. If a command prints more than a screen, pipe it through
`tail`. The context you do not spend on noise is context you spend on the problem.

Read narrowly: find code with grep first (`grep -n`, or the Grep tool), then read only the range
you need. Never print a whole file of more than about 300 lines — not with `cat`, not with
`sed -n` over all of it, not with Read and no range. Whatever an agent reads stays in its
context until its story ends, and a wave records how large each one grew (ADR-0008).

## Skills and commands

The stack's skills live in `.claude/skills/`, one folder per part of the stack. They are
written for this project by skill writers, in Phase 0 and whenever a part joins
(`docs/STACK_SKILLS.md`, ADR-0014); Claude Code loads each one when work touches its part.

The owner's commands live in the same folder — `/ideate`, `/feature`, `/fix`, `/refactor`,
`/implement`, `/autopilot`, `/resolve`, `/sprint-review`, `/project-review`,
`/retro`, `/stack-skills`, `/standup`, `/board`. Each is a skill only the owner can start: it is
never loaded into an agent's context, and an agent never runs one.
