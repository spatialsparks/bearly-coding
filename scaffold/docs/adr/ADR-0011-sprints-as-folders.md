# ADR-0011 — Sprints are folders, stories are files, and a sprint leaves this machine only when it is reviewed and finished

**Date** {{YYYY-MM-DD}}
**Status** accepted — amends ADR-0005 (new words, one sprint in flight, a commit per story and
one merge per sprint), ADR-0007 (the finished sprint is read once more as a whole, by two
reviewers, before it is pushed), ADR-0004 and ADR-0008 (the reviewers run at effort `max`) and
ADR-0010 (directive 12 is the Standards reviewer's to check); amended by ADR-0012 (what builds
by itself is `/autopilot`, a stuck sprint no longer stops it, and `/implement` builds one story
by hand)

## Context

**The words were one level off.** The board had three levels — a milestone, a story with its
spec, a task card — and a fourth word, sprint, for whatever batch of tasks the orchestrator ran
together. The owner thinks of it more simply: a sprint is the thing that was asked for, and it
is made of stories. That is also how Matt Pocock's skills lay out their tracker — a folder per
feature, a spec, one file per ticket — and several parts of this decision are adapted from
them.

**A batch landed by itself.** Every batch was squashed onto `main`, pushed and deployed. `main`
moved every few tasks with several stories mixed in one commit, nobody read a feature as a
whole before it was live, and the squash hid which change built which task.

**Planning forgot what it learned.** Each planning command ran its own interview, one question
at a time. The project's words were never written down, so every session learned them again
and used twenty where one would do. Every technical choice was to be an ADR, whether or not
anybody would ever ask why.

**Lessons stayed where they fell.** In a sprint log that grew by a screen per batch, in the
history of a card, in a verifier's report. Nothing moved them to where the next session reads.

## Decision

**Three words** (`docs/AGENT_WORKFLOW.md`). The ADRs before this one keep their wording; read
them with this table.

| Before | Now | On disk |
| --- | --- | --- |
| milestone, and story `ST-012` with `story.md` | **sprint** `S-012` | a folder in `docs/board/sprints/`, with `sprint.md` as its spec |
| task card `T-012.3` | **story** `S-012.3` | a file in that folder |
| sprint `12`, the batch | **wave** `12` | `docs/board/log/wave-0012.md`, once it is verified |

Numbers carry over: what was `ST-012` is `S-012`, what was `T-012.3` is `S-012.3`.

**More files, fewer long ones.** One file per wave in `docs/board/log/` replaces the sprint
log. The sprints are in `docs/board/sprints/`: a sprint's folder holds its spec, its stories,
its review and its retro, and moves to `docs/board/sprints/done/` when it is finished.
`docs/board/LATER.md` holds the parking lot and what was decided against. `docs/GLOSSARY.md`
holds the project's words, `docs/FEATURES.md` what the product does today.

**A sprint lands whole** (`docs/ORCHESTRATION.md`).

- One sprint is in flight, on a local `sprint/S-NNN` branch. Nothing of it is pushed or
  deployed before it is finished.
- Each story becomes exactly one commit on that branch, with its id in the subject:
  `feat: the dialog copies the link (S-012.2)`.
- Each wave is verified once, as before: the full verify, then one verifier.
- When the last story is in, two reviewers read the whole sprint in fresh contexts, side by
  side: one against `sprint.md`, one against the project's standards. What they class as
  **must fix** is fixed as stories of the sprint and read again; what is **for the owner**
  waits in the sprint's `review.md`.
- Then one merge commit on `main`, the push, and the deploy. With `land: ask` in `BOARD.md` the
  orchestrator waits for the owner's yes before that.

**Planning is one conversation** (`docs/PLANNING.md`). `/ideate` interviews in rounds — every
question that can be asked now, each with a recommended answer — looks facts up itself, writes
a term into the glossary the moment it settles, and proposes an ADR only for a decision that is
hard to reverse, surprising without its context, and a real trade-off. `/feature` turns
that conversation into the sprint's spec and its stories, cut as slices — or interviews
briefly itself when nothing came before. `/fix` and `/refactor` add work of their own kind. All of them write on a `plan/` branch the orchestrator
merges, as before.

**Standards are the reviewer's.** `docs/CODING_STANDARDS.md` is read by reviewers, not by
implementers, whose context is for the story (ADR-0008). A mistake a tool could catch becomes a
check, not a sentence in that file.

**Tests come first** (directive 14): one test, see it fail, the code, the next.

**A sprint ends with a retro.** `/retro` moves what should outlive the sprint to where it will
be read — the feature list, the glossary, an ADR, the standards, a stack skill — and the
sprint's folder to `sprints/done/`. `/sprint-review` runs the two reviewers on demand,
`/project-review` surveys the whole codebase for what to improve, and `/standup` says where
things stand and which command is next.

## Consequences

**Good.** One word fewer, and the same picture in the owner's head and on disk. The remote and
the deployed product only ever hold sprints that were finished and read as a whole. A story is
one commit: it can be read, reverted or sent ahead by itself, and the verifier and the
reviewers read a commit, not a range of branches. The glossary shortens every later session. A
sprint's folder is its whole record, and no file grows without end.

**Bad.** With one sprint in flight, agents are only as parallel as the sprint was sliced; the
old batches filled their slots from several stories at once. A fix waits for its sprint unless
the owner sends it ahead. A sprint in flight exists on this machine only: a lost disk loses it.
One blocked story stops the line until the owner unblocks it or takes it out of the sprint.
Each sprint costs two more agent runs at effort `max`. `main` receives planning documents
between landings, so a host that deploys on every push would redeploy unchanged code. There are
more commands to remember. And the glossary and the feature list are only as true as the last
retro.

**Cost to reverse.** Medium. It is process, not code, but the ids are in every story, every
commit subject and every log file.

## Alternatives considered

| Alternative | Why not |
| --- | --- |
| Each wave lands, pushed and deployed, as the old sprints did | Keeps every slot busy and `main` current, but puts work online that nobody has read as a whole. The owner chose to hold a sprint back until it is reviewed. |
| One squash commit per sprint | The shortest log, but a story could no longer be read or reverted by itself. |
| Several sprints in flight, each on its own branch | The parallelism back, but two sprint branches collide when the second lands, and the full verify runs one at a time anyway. |
| The sprint's review in place of the wave's verifier | Cheaper, but a story's mistake would be found when the sprint is finished and other stories already stand on it. |
| The verifier enforcing the standards too | It reads every wave, so the standards file would be loaded several times a sprint, and its findings would arrive while the stories they concern are still moving. |
| Using the skills as a plugin instead of adapting them | A project would need the plugin installed, in the right version, to run its own commands. A project carries what it needs. |
| Sprint folders directly in `docs/board/` | Shorter paths, but the sprints then sit between the board's own folders — `inbox/`, `inputs/`, `log/` — and no one folder lists them. The owner chose a `sprints/` level. |

## Where it comes from

The interview in rounds, the glossary and its format, the three-part test for an ADR, stories
cut as slices and the three-step wide change, test first, the two-axis review with its baseline
of code smells, what a retro looks for, and the prototype and research detours are adapted
from Matt Pocock's skills — https://github.com/mattpocock/skills, MIT licence, © 2026 Matt
Pocock. The words are this template's own; nothing here needs his plugin.
