---
name: ideate
description: Think an idea through before anything is planned - a relentless interview in rounds that writes the project's terms and decisions down as they settle. In a new project it ends in the brief KICKOFF.md, afterwards in a shared understanding that /feature turns into a sprint.
argument-hint: '[the idea, as rough as it is - a paragraph, a transcript, a link]'
disable-model-invocation: true
---

I want to think something through with you before any of it is planned or built. Here is the
idea:

$ARGUMENTS

If nothing stands above this line, ask me for the idea before anything else — as rough as it
is: a paragraph, a voice-note transcript, a sketch, a competitor's URL.

**A project that has not been kicked off.** If `.claude/skills/ideate/PROJECT.md` exists, this
project has no Phase 0 yet and the idea is the product itself: read that file and follow it
together with what follows. Its questions come first, and it says what to write at the end.

Read first: CLAUDE.md, docs/GLOSSARY.md, docs/FEATURES.md, docs/board/LATER.md,
docs/board/BOARD.md and docs/PLANNING.md — all of it, it is how this session works. Then only
the code at the boundaries the idea touches, found with grep and read by range.

**Interview me relentlessly**, as docs/PLANNING.md has it, until we understand the same thing:

- In rounds. Each round asks every question that can be asked now, numbered, hardest first,
  each with the answer you would recommend. A question that hangs on one still open waits for a
  later round. Then stop and wait for my answers.
- Facts are yours to find, decisions are mine. Look up what the repository, the glossary, the
  feature list, an ADR or a tool's documentation can tell you — send a sub-agent if it is
  legwork — and never ask me for something you could have read.
- Push back where the idea is vague, contradicts itself, repeats something in
  docs/FEATURES.md or was decided against in docs/board/LATER.md, or is bigger than it needs to
  be. If a simpler shape gets 90% of the value, say so before we design the complicated one.
- Test what I say on an awkward case, and against the code.

**Write things down as they settle**, not at the end — in a worktree of your own, on a `plan/`
branch, as "Where a planning session writes" in docs/PLANNING.md says. Make the worktree when
the first thing is worth writing:

- A term whose meaning we have settled goes into docs/GLOSSARY.md at once, in its format. Call
  it out when I use a word against the glossary, or one word for two things.
- A decision that is hard to reverse, surprising without its context, and a real trade-off
  becomes a proposed ADR in docs/adr/proposed/. Offer it; do not write one for anything less.
- An idea I park, or say no to, goes into docs/board/LATER.md, with the reason.

**Two detours**, both in docs/PLANNING.md. When a question needs something to look at or to
play with, offer a throwaway prototype on a `prototype/` branch. When it needs facts from
outside, start a sub-agent in the background that writes docs/research/<topic>.md with its
sources, and carry on with the questions that do not wait for it.

**The end.** When no question is left and nothing is assumed, say in a few lines what we
agreed: what is to be built and for whom, what it must never do, what is out of scope, the
terms we added, the decisions we proposed, what we parked. Ask me to confirm it. Commit what
you wrote on the plan branch. Then tell me to type `/feature` **in this same session, without
`/clear`** — it works from this conversation, and does not interview me again.

Do not write a sprint, a story or any code in this session, and change no file outside what a
plan branch may hold.
