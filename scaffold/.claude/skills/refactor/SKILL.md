---
name: refactor
description: Put a refactoring on the board - behaviour pinned by tests first, then the restructuring as a technical sprint or one story, committed on a plan branch for autopilot to merge. Safe while a sprint is being built.
argument-hint: '[what to restructure, and why it hurts]'
disable-model-invocation: true
---

Help me put a refactoring of {{PROJECT_NAME}} on the board. A refactoring changes how the code
is shaped and nothing it does. A sprint may be in flight while we do this. That is fine: you
only ever create new files under docs/board/, on a branch of your own.

The refactoring: $ARGUMENTS

If nothing follows "The refactoring:", ask me what I want restructured before anything else. If
I do not know where the code hurts most, say that `/project-review` finds it.

Read: CLAUDE.md, docs/GLOSSARY.md, docs/PROGRESS.md (its known debt), docs/board/BOARD.md,
docs/ARCHITECTURE.md, docs/PLANNING.md, docs/AGENT_WORKFLOW.md (sprints, stories, slicing, the
definition of ready, owned paths and parallel work), docs/board/_TEMPLATE-sprint.md and
docs/board/_TEMPLATE-story.md. Then only the code at the boundaries of what is to change, and
the `CLAUDE.md` of each directory involved.

1. **Interview me**, as docs/PLANNING.md has it — in rounds, each question with the answer you
   would recommend — until you know:
   - what hurts today, concretely: a boundary crossed, the same thing written twice, a module
     whose interface is as large as what it hides, a test that takes a minute;
   - the shape it should have afterwards;
   - what must not change: behaviour, a public surface, a stored format;
   - how we would know nothing broke: which tests hold the behaviour today.
   Push back if it serves a future that is not on the board (directive 10), or if it is bigger
   than the pain it removes.
2. **Decide its size**, and tell me:
   - one agent in one session: a single story. Write it as `/fix` does —
     docs/board/inbox/<slug>.md, unnumbered, **Kind** `refactor` — and skip to step 5.
   - more than that: a technical sprint, docs/board/sprints/S-NNN-refactor-slug/.
3. **Make room and pick the number**, as "Where a planning session writes" in docs/PLANNING.md
   says: a worktree of your own, on `plan/S-NNN-refactor-slug`, or `plan/<slug>` for a single
   story.
4. **Write the sprint and its stories** there:
   - sprint.md says under Why what hurts, under What it delivers the shape afterwards, and
     under Rules what must stay true. It has no Behaviour table — say "no behaviour changes"
     instead of filling one with air. Its acceptance criteria are things I could check: the
     gates green, the architecture check unchanged or stricter, no public surface changed
     unless the sprint names it.
   - If no test holds the behaviour today, the first story writes those tests, against the code
     as it is. Nothing moves before it is in.
   - A change to a contract — a port, a shared type, the storage format, the public surface of
     a shared module — is its own Solo story, first. The stories after it have disjoint owned
     paths and list every shared file they touch.
   - A wide mechanical change — a rename, a retyped symbol — goes in three steps: add the new
     form beside the old; move the callers over in batches by directory, one story each; delete
     the old form in a last story that depends on every batch.
   - Every story leaves the product working and both gates green: a refactoring that is red in
     the middle is one story, not two. **Kind** is `refactor` on every one.
5. **Show me** what you wrote, and change what I ask.
6. **Land it**: commit only the new files, as "docs: plan S-NNN — <title>" (or
   "docs: story — <title>"), and push the branch — a backup, not a request: there are no pull
   requests (ADR-0009). Autopilot merges it into main at its next wave planning, and
   removes the branch and the worktree. Tell me that it waits there until it is brought in:
   `/autopilot` does that by itself, and `/implement` offers to.

Never edit docs/board/BOARD.md, docs/board/log/, docs/PROGRESS.md, an existing sprint or story,
or any source file: this session plans the refactoring, a sprint does it.
