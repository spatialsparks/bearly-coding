# Stack skills — what this project knows about its own stack

A stack skill is what an agent reads before it touches one part of the stack: where that part
sits in the architecture, how its rules are enforced, how it is tested, what a parallel agent
may run, and the traps. Each part has one, in `.claude/skills/<part>/SKILL.md`, and Claude Code
loads it when work touches that part — for an implementer in a wave as much as for a session of
the owner's.

This project writes its own (ADR-0014). Nothing is installed from a library: a skill is written
from the documentation of the versions this project uses, and it grows with what the sprints
teach.

## A part of the stack

One technology with rules of its own that the code touches directly: the language with its
package manager and tooling, each framework, the persistence, the test stack, the host, and a
library large enough to have conventions — a map renderer, an ORM, a game engine. Not every
dependency: a library used in one place is a row in the ledger of
`docs/adr/ADR-0003-dependencies.md`, and a line in a skill at most.

Each part gets a folder named for it in lower-case with hyphens — `react`, `postgres`,
`python-uv` — and never the name of a command (`.claude/README.md` lists them).

## What every skill answers

The same seven questions, under these headings and in this order. A question that does not
apply to a part is answered in one line that says so, never left out. A part may add sections
of its own between them.

1. **Where it sits in the architecture** — how the part maps onto domain, application,
   infrastructure and interface, where its ports live, and what the composition root does with
   it.
2. **The dependency rule, enforced** — which tool, which rules, and the test that proves each
   rule fires.
3. **Tooling and versions** — the pinned runtime, exact versions, the committed lockfile, the
   settings that matter.
4. **Tests** — unit, contract against the real thing run locally, end to end.
5. **The two verify tiers** — what is safe for agents side by side (`{{VERIFY_FAST}}`: no
   ports, servers, containers or emulators) and what only the sprint lead runs
   (`{{VERIFY_COMMAND}}`).
6. **Parallel waves** — what a fresh worktree needs before it can build, and which shared files
   must be named as owned paths.
7. **Gotchas** — the things that cost an hour.

Then two lists that keep it honest:

- **Sources** — the pages the rules came from, numbered, each with the day it was read. A rule
  ends with the number of its page in brackets.
- **Not yet confirmed** — every rule the writer could not find in the documentation or could
  not check against this project. `/retro` takes a line out when a sprint has proven it, and
  corrects the rule when a sprint has proven it wrong.

The shape of the file:

```markdown
---
name: <part>
description: <what the skill covers and when to use it, in a sentence or two>
---

# <Part>

> Written on <date> for <part> <version>, from <documentation site>. A number in brackets
> points at Sources. A line a sprint added or corrected carries that sprint's id.

## Where it sits in the architecture
## The dependency rule, enforced
## Tooling and versions
## Tests
## The two verify tiers
## Parallel waves
## Gotchas
## Sources
## Not yet confirmed
```

The `description` is what Claude Code reads to decide whether to load the skill, so it names
the part and the work it applies to. A skill is loaded whole whenever work touches its part:
keep it to about 150 lines, rules rather than explanations (ADR-0008).

## Having skills written

`/kickoff` does this once for the whole stack, `/stack-skills` for the parts it is given, and
`/feature` for a part a new sprint brings in. Always in a session the owner is in.

1. **List the parts.** From `docs/ARCHITECTURE.md`, the package manifest and — in Phase 0 —
   section 2 of `KICKOFF.md`. Say which already have a skill in `.claude/skills/`, and which
   have a draft in `.claude/skill-drafts/` (see below).
2. **Show the owner the list, in one go**: each part that gets a skill, the version it is
   written for, and the documentation site its writer will read — the official one, and the
   page for that version where there is one. The owner strikes and adds.
3. **Start one skill writer per part** (`.claude/agents/skill-writer.md`), side by side, at
   most `max_parallel` at once. Each brief names: the part and its version; the documentation
   site; the file to write, as a full path; the draft to start from, if there is one; and, for
   a refresh, that the skill exists and what changed.
4. **The owner answers Claude Code's questions.** In the default and accept-edits modes it asks
   before a writer reads a site for the first time, and before a skill is written under
   `.claude/`. Both are the owner's to answer. In auto mode a background check decides instead,
   and in bypass mode nothing asks, so the review that happens in every mode is step 6. Add no
   allow rule for either to `.claude/settings.json`: a rule
   cannot tell a skill writer from an agent on autopilot, and those read no web pages and
   write no skills.
5. **Check each skill**: the frontmatter's `name` is the folder's; the seven headings, Sources
   and Not yet confirmed are there; no rule without a number; it is not named like a command;
   and the writer touched nothing outside its folder (`git status --short`).
6. **Show the owner** one line per skill, and under it what is not yet confirmed. Change what
   they ask.
7. **Commit**: `docs: stack skills — react, postgres, playwright`. In Phase 0 that is a commit
   on `main`, like every step there. Afterwards it is a commit on a plan branch
   (`docs/PLANNING.md`), which is brought in like any other.

A writer whose write is refused hands the whole skill back in its report, and the session that
started it writes the file. A writer that is refused a site writes what it can from what is in
the project — the installed package's own files — and lists the rest as not yet confirmed.

## Refreshing a skill

When a part moves to a new major version, or a skill has gone stale: `/stack-skills <part>`.
The writer starts from the skill as it is, reads the documentation for the new version, and
reports what it changed. It never removes a line that carries a sprint's id: what this project
learned stays until a sprint proves otherwise.

## Drafts from earlier projects

`.claude/skill-drafts/` holds skills the owner brought along from other projects. Git ignores
the folder, and Claude Code does not load what is in it. A writer whose part has a draft there
starts from it rather than from nothing: it checks each rule against the documentation and
against this project's architecture, keeps what holds, and says in its report what it dropped
and why. Once Phase 0 is done, the folder can be deleted.
