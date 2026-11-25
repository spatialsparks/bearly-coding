---
name: feature
description: Turn an idea into a sprint on the board - a short interview first, or none if this session has just ideated it - then its spec and its stories, cut as slices, committed on a plan branch for autopilot to merge. Safe while a sprint is being built.
argument-hint: '[the feature, as rough as it is - or nothing, right after /ideate]'
disable-model-invocation: true
---

Help me add a feature to {{PROJECT_NAME}} as a new sprint on the board: its spec and its
stories. A sprint may be in flight while we do this. That is fine: you only ever write a new
sprint folder, on a branch of your own, and you never touch anything a sprint touches.

The feature: $ARGUMENTS

There are two ways in, and the conversation above this command says which:

- **We have just ideated it** — this session ran `/ideate`, or I pasted a brief. The thinking
  is done: do not interview me again.
- **Nothing came before.** Interview me first; if nothing follows "The feature:" either, ask me
  what I want to build before anything else. If it turns out to be foggy — more than two
  rounds of questions, or a question that needs a prototype — say so: `/ideate` is the better
  place to think it through.

Read: CLAUDE.md, docs/GLOSSARY.md, docs/FEATURES.md (what exists), docs/board/LATER.md (what
was decided against), docs/board/BOARD.md (what is planned, what is in flight),
docs/PLANNING.md, docs/AGENT_WORKFLOW.md (sprints, stories, slicing, the definition of ready,
owned paths and parallel work), docs/ARCHITECTURE.md, docs/board/_TEMPLATE-sprint.md and
docs/board/_TEMPLATE-story.md — whatever of these this session has not read already. Then only
the code at the boundaries the sprint touches, enough to name the stories' owned paths.

1. **Find out what is still open.**
   - After an ideation: write down what we agreed, and ask only what the files cannot be
     written without, in one round, numbered, each with the answer you would recommend. That is
     usually where the behaviour is tested — the public interface the tests go through, the
     fewer the better, an existing one before a new one — and how fine to cut.
   - Otherwise interview me, as docs/PLANNING.md has it: in rounds, every question that can be
     asked now, numbered, each with the answer you would recommend. Until you know who it is
     for, the one behaviour it must have, what must never happen, what is out of scope, and
     where it is tested. Look facts up yourself. Push back if it is bigger than it needs to be,
     if it overlaps something in docs/FEATURES.md or a sprint on the board, or if
     docs/board/LATER.md says it was decided against.
2. **Size it**, and tell me. A sprint is one outcome I could see working. One agent in one
   session is no sprint at all: a single story — write it into docs/board/inbox/ as `/fix`
   does, and skip to step 6. More than about eight stories, or two behaviours that have nothing
   to do with each other, is two sprints: say so, and plan them in the order they should be
   built.
3. **Make room and pick the number**, as "Where a planning session writes" in docs/PLANNING.md
   says: a worktree of your own, on `plan/S-NNN-slug`. If `/ideate` made a worktree in this
   session, write there, and rename its branch to carry the sprint's number:
   `git branch -m plan/S-NNN-slug`.
4. **Write docs/board/sprints/S-NNN-slug/sprint.md** from the template, in the glossary's
   words: why, what it delivers, behaviour, states and edge cases, rules, the decisions we
   made — each a line, with its ADR or its prototype's branch if it has one — where it is
   tested, acceptance criteria, what is not in scope. No file paths in the spec: they are the
   stories' business. A term we had to settle goes into docs/GLOSSARY.md; a decision that is
   hard to reverse, surprising and a real trade-off becomes a proposed ADR. If the sprint
   brings in a part of the stack that has no skill in `.claude/skills/` — a framework, a
   store, a host — have its skill written now, before the stories are cut, as
   docs/STACK_SKILLS.md says: in this worktree, and as a commit of its own. The stories then
   follow it.
5. **Cut it into stories** in the same folder — S-NNN.1, S-NNN.2, … — each ready by the
   definition of ready and sized for one agent in one session:
   - a slice, not a layer: each story a narrow but complete path, so something can be seen or
     checked when it is in;
   - a contract change — a port, a shared type, the memory fake — first, as its own Solo story;
   - the stories after it with disjoint owned paths that list every shared file they touch.
     One sprint is in flight at a time, so this is what decides how many agents can work side
     by side;
   - if the code is in the way, the restructuring is a story of its own, first;
   - the sprint's one end-to-end test named on the story that completes its main path.
6. **Show me the cut** as a numbered list — each story's title, what it depends on, and what
   it makes work — and ask: is it too coarse or too fine, are the dependencies real, should any
   two be merged or one be split. Change what I ask, until I say it is right.
7. **Land it**, as docs/PLANNING.md says: commit only what a plan branch may hold, as
   "docs: plan S-NNN — <title>", and push the branch — a backup, not a request: there are no
   pull requests (ADR-0009). Tell me that it waits there until it is brought in — `/autopilot`
   merges it at its next wave planning, `/implement` offers to — and where the sprint will
   stand in the board's order.

Never edit docs/board/BOARD.md, docs/board/log/, docs/PROGRESS.md, or anything outside what a
plan branch may hold — and never a sprint that is in progress or landed. If the feature changes
such a sprint rather than adding one, stop and say so: it is changed through the orchestrator.
