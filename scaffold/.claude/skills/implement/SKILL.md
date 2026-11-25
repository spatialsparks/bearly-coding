---
name: implement
description: Build one story by hand, with the owner in the room - ask which story if none is named, build it in the checkout as it is, test first, record it on the board, and stop for the owner's review. Changes nothing in git - the owner commits and pushes. The careful way, and the default; /autopilot is the other.
argument-hint: '[a story or a sprint, as S-NNN.N or S-NNN - default - it asks]'
disable-model-invocation: true
---

Build one story of {{PROJECT_NAME}} with me, by hand. I read what you write before it goes
anywhere: you build one story and stop, and I review it, commit it and push it.

What to build: $ARGUMENTS

**Change nothing in git.** No commit, no push, no new branch, no switch, no worktree, no stash,
no reset — and never a deploy. Read git as much as you like: status, diff, log, branch.
Whatever you change is a change in the working tree, on the branch that is checked out, for me
to look at with `git diff`. The one exception is step 3, and only on my yes.

Read first: CLAUDE.md, docs/PROGRESS.md, docs/board/BOARD.md, docs/GLOSSARY.md,
docs/PRIME_DIRECTIVES.md, and "By hand" in docs/ORCHESTRATION.md.

1. **Look before you ask.** `git status --short`, `git branch --show-current`,
   `git worktree list` and `git branch -a --list "*plan/*"`.
   - An orchestrator is at work — BOARD.md's current_wave is a number, or a worktree under
     .claude/worktrees/ is locked: stop and tell me. Two builders in one sprint collide.
   - The working tree holds changes that are not committed: tell me which files, and ask
     whether to go on. Usually the last story is still waiting for my commit.
2. **Bring the board up to date**, as changes in the working tree. An input in
   docs/board/inputs/ that I have answered is applied as move 2 of docs/ORCHESTRATION.md says:
   its story back from Blocked to Ready, its file to docs/board/inputs/done/. A sprint folder
   or a story under docs/board/sprints/ that BOARD.md does not list yet goes onto the board the
   same way; a story in docs/board/inbox/ gets its number and moves to its sprint's folder —
   move the file plainly, git sees the rename when I add it. Tell me what you listed.
3. **Plans that wait on branches.** If a `plan/` branch holds commits this branch lacks, name
   each and ask whether to bring them in. On my yes, and only then: check each with
   `git diff --stat HEAD...<branch>` — it may hold only what docs/PLANNING.md says a plan
   branch may hold — and `git merge --no-ff -m "docs: plan — <title>" <branch>`. Push nothing
   and delete no branch. On my no, go on without them.
4. **Ask what to build**, unless I named a story above. Show the sprint that is in progress —
   or, if none is, the first planned one — as a short list: each story's id, its title and its
   state: ready, waiting for which story, blocked and on what, done. Then ask which one, with
   the ready stories as the choices, the top of Ready first, and room for me to type any other
   story or sprint. If you have a tool that puts a question as choices, use it: it takes four
   at most, so with more ready stories offer the first three and "the whole sprint".
   - I named or chose a **sprint**: take its first ready story, stop after it as step 9 says,
     and take its next one when I say so. You still build one story at a time.
   - The story is not ready — a dependency is not done, a field is missing, an open question
     in its sprint.md blocks it: say what it lacks, and ask again. Do not start it.
5. **Say what you are about to do**, in five lines at most: the story's goal, the files you
   expect to touch, the tests you will write first. Then start: I chose the story.
6. **Build it yourself** — no sub-agent, no worktree. Read the story's sprint.md, the story,
   and only what its Read list names; find code with grep first, then read only the range you
   need, and never print a whole file of more than about 300 lines. Stay inside the story's
   owned paths. Test first, as directive 14 has it: one test, watch it fail, the least code
   that passes it, the next — and no tests beyond those. For a bug, run the story's Reproduce
   command first and see it fail. Concise and scalable, as directive 12 asks, in the words of
   the glossary. `{{VERIFY_FAST}}` until it is green, then `{{VERIFY_COMMAND}}`, once.
7. **Decide nothing the story did not decide.** Stop and ask me, with the options and the one
   you would take, before you: add a dependency; change a contract — a port, a shared type,
   the storage format, the public surface of a shared module; touch a file outside the story's
   owned paths; change a check, a gate or a test that already exists; choose between two
   designs the story leaves open; or do anything a prime directive speaks against. When I have
   answered, write the decision down as part of this change: a line under Decisions in the
   sprint's spec — or a proposed ADR, if it is hard to reverse, surprising without its context,
   and a real trade-off.

   And build nothing I did not ask for. A bug you pass, a clumsy function next door, a test
   that is missing somewhere else: leave it, and name it in your report. Whether it becomes a
   story is mine to say; `/fix` writes it.
8. **Record it**, in the working tree like everything else:
   - docs/board/BOARD.md — the story to Done, the sprint's count, the sprint `in progress`
     with current_sprint set to it, next_wave one higher;
   - docs/board/log/wave-NNNN.md, in the shape docs/board/log/README.md gives, with
     "verified, by hand" as its result and no Contexts lines;
   - docs/PROGRESS.md where reality changed, and the `CLAUDE.md` of a directory whose public
     surface changed;
   - a story of S-000: its file moves to docs/board/sprints/done/S-000-maintenance/.

   If that was the sprint's last story, set the sprint to `built` and current_sprint to
   `none` — unless the branch checked out is a `sprint/` branch, which `/autopilot` will
   review and land: then leave the sprint in progress and say so.
9. **Report, and stop.**
   - What you built, in two lines, and the files you changed — the board's own apart.
   - The output of both verifies.
   - Each acceptance criterion, met or not.
   - What you asked me and what I decided; what you noticed and left alone.
   - A commit message for me to use, `<kind>: <what the story delivers> (<id>)` — the story's
     Kind and, closing the subject, its id: `feat: the dialog copies the link (S-012.2)`. That
     is how the board, the inspector and `/autopilot` find a story's commit.
   - What comes next: `/sprint-review uncommitted` for a second reading before I commit; the
     next ready story; and, when a sprint is built, that reviewing it (`/sprint-review S-NNN`),
     merging it and pushing it are mine, and that `/retro` then closes it.

   Do not start another story. If I gave you a sprint, wait for my word; when it comes, see
   with `git status --short` that the last story is committed, and take the next.

Stop and ask me rather than working around it when: a verify still fails after two honest
attempts at the real cause; the story needs something only I can do; the story is wrong or out
of date — say what you would change in it, and change it only when I agree; or doing it as
written would break a prime directive. Never weaken a gate to get to green.

If what the story needs I cannot give now — an account that takes days, a decision I want to
sleep on — write an input for it in docs/board/inputs/, as "Inputs" in docs/ORCHESTRATION.md
says, move the story to Blocked on the board, and stop. `/resolve` takes me through it later.
