---
name: fix
description: Put a bug or a small change on the board as one story in the inbox - reproduced first, with the command that fails - and commit it on a plan branch for autopilot to merge. Safe while a sprint is being built.
argument-hint: '[what is broken, or the small change that is wanted]'
disable-model-invocation: true
---

Help me put one story on the board of {{PROJECT_NAME}}: a bug, a chore, a small change. A sprint
may be in flight while we do this. That is fine: you only ever create one new file in
docs/board/inbox/, on a branch of your own, and autopilot gives it its number at its next
wave planning.

What is wrong, or wanted: $ARGUMENTS

If nothing follows that line, ask me what needs doing before anything else.

Read: CLAUDE.md, docs/GLOSSARY.md, docs/PROGRESS.md (its known debt), docs/board/BOARD.md,
docs/board/inbox/README.md, "Where a planning session writes" in docs/PLANNING.md, the
"Stories", "Definition of ready" and "Owned paths and parallel work" sections of
docs/AGENT_WORKFLOW.md, and docs/board/_TEMPLATE-story.md. Then only the code the story
touches, enough to name its owned paths.

1. **Ask me only what the story cannot be written without**, in one round, each question with
   the answer you would guess: what happens now, what should happen instead, how I see it, and
   whether it is a regression — something that worked and broke.
2. **For a bug, reproduce it before you write anything.** Find the one command that fails while
   the bug is there: an existing test run alone, a script against the code path, a request to
   the running app. Run it and look at what it prints. Change no file to get there. Write the
   command and its output into the story's **Reproduce** line — or "not reproduced", with what
   you tried, and the first thing the story then asks for is a command that does fail. Do not
   look for the cause beyond what that takes, and do not fix anything: a guess at the cause in
   the story sends the implementer the wrong way.
3. **Check it is one story**: one agent, one session, one concern.
   - It needs more than that, or it is something a user would call a new capability: stop and
     say so. That is `/feature`, or `/refactor` for restructuring.
   - It changes what a sprint's spec promises: stop and say so. A sprint is changed through the
     orchestrator.
   - It is already on the board, or in the known debt with a story: tell me which, and write
     nothing.
4. **Pick the sprint it belongs to**: a sprint that is planned or in flight if the work is
   plainly part of it, otherwise S-000.
5. **Make room**, as docs/PLANNING.md says: a worktree of your own, on `plan/<slug>`.
6. **Write docs/board/inbox/<slug>.md** there, in the shape of docs/board/_TEMPLATE-story.md and
   as docs/board/inbox/README.md says: `S-NNN.N` left as it is in the title, **Sprint** set to
   the sprint from step 4, **Kind** `fix` for a bug and `chore` or `feat` otherwise, and every
   field filled in, so that it is ready by the definition of ready. For a bug: **Now**,
   **Should** and **Reproduce**, and the criterion that a test holds it. Describe what the
   system should do, not which lines to change. If you cannot name the owned paths, say in the
   story what is missing: it will wait in Backlog. For a regression, the line under the title
   reads `**Regression** yes`.
7. **Show me** the story, and change what I ask.
8. **Land it**: commit only the new file, as "docs: story — <title>", and push the branch — a
   backup, not a request: there are no pull requests (ADR-0009). Autopilot merges it
   into main at its next wave planning, and removes the branch and the worktree. Tell me that
   it waits there until it is brought in. On autopilot it is built in the next wave with a
   free slot — first of all if it is a regression — and lands with the sprint in flight. By
   hand, `/implement` offers to bring it in, and I choose when to build it.

Never edit docs/board/BOARD.md, docs/board/log/, docs/PROGRESS.md, a sprint, another story, or
any source file. Do not fix the thing yourself: this session writes the story, a wave does the
work.
