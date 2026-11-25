# ADR-0014 — Stack skills are written by the project, one skill writer per part

**Date** {{YYYY-MM-DD}}
**Status** accepted

## Context

An agent that starts cold needs to know how this project uses each part of its stack: where a
framework sits in the layers, which tool enforces the dependency rule, what the fast verify may
start, what costs an hour. That knowledge lives in stack skills, which Claude Code loads when
work touches their part (`docs/AGENT_WORKFLOW.md`).

A library of ready-made skills, copied in at Phase 0, is one way to get them. It covers only
the stacks its author has used, it describes the versions of the day it was written, and
somebody has to keep it current. The other way is to write them where they are used: the
documentation of every part is public, and reading it for the version in hand is work an agent
does well in a context of its own.

Two facts shaped the answer. A skill is an instruction every later agent follows, so what goes
into one matters more than what goes into a source file. And Claude Code asks the owner before
anything is written under `.claude/`, in every mode that asks at all, and refuses it to an
agent that never asks.

## Decision

- **This project writes its own stack skills**, one per part of the stack, in
  `.claude/skills/<part>/SKILL.md`. Nothing is installed from a library.
- **One skill writer per part** (`.claude/agents/skill-writer.md`), each in a fresh context,
  several side by side. A writer reads that part's official documentation for the version in
  use and writes one skill to the outline in `docs/STACK_SKILLS.md`.
- **Nothing is guessed.** Every rule points at the page it came from, and what a writer could
  not confirm is listed as such at the end of the skill.
- **Only in a session the owner is in.** `/kickoff` has them written in Phase 0,
  `/stack-skills` at any time, `/feature` when a sprint brings in a new part. Claude Code asks
  the owner before a writer reads a site and before a skill is written, and those two questions
  are the review. No allow rule is added for either, and nothing on autopilot writes a skill.
- **Sprints grow them.** `/retro` writes what a sprint taught about a part into its skill, with
  the sprint's id. A writer that refreshes a skill keeps those lines.
- **An owner's earlier skills are a starting point, not a source of truth.** Skills brought
  from other projects wait in `.claude/skill-drafts/`, which git ignores; a writer whose part
  has a draft checks it against the documentation and this project's architecture.

## Consequences

**Good.** Any stack is served, in the versions this project pins. Nothing has to be kept
current outside the project. A skill is versioned with the code it describes.

**Bad.** A new project's skills are untested notes until its first sprints have used them: a
rule read off a documentation page can be wrong for this project, and the first retro is where
that shows. Phase 0 costs one agent per part, and the owner answers a question per site and per
skill. A lesson learned in one project reaches the next only if the owner carries the skill
over. And a writer reads web pages: what a page says becomes a rule only with its source beside
it, and the owner sees every skill before it is committed.

**Cost to reverse.** Low: skills are files. A library can be copied over them at any time.

## Alternatives considered

| Alternative | Why not |
| --- | --- |
| A library of skills shipped with the template | Covers its author's stacks and versions only, and has to be maintained for everyone who uses it. |
| The implementer of a part's first story writes the skill | That agent runs on autopilot, where nothing is written under `.claude/` and nobody answers a question; and the skill would come after the code it should have guided. |
| One agent writes all of them | One context then holds the documentation of every part, and reads each less closely (ADR-0008). |
| No skills: every agent reads the documentation itself | Every story pays for the same reading, and what a sprint learned has nowhere to go. |
