---
name: retro
description: Look back at a sprint that has landed - read its spec, its stories, its wave logs and its review, move what should outlive it into the feature list, the glossary, an ADR, the standards and the stack skills, propose a check for every mistake a tool could have caught, and move its folder to done.
argument-hint: '[the sprint, as S-NNN - default - the first landed sprint that has had no retro]'
disable-model-invocation: true
---

Run the retrospective of a sprint of {{PROJECT_NAME}} that has landed. A sprint leaves what it
learned where it fell: in a story's history, in a wave's log, in a reviewer's list. Move what
should outlive the sprint to where the next session will read it, and tell me what would make
the next sprint run better. A sprint may be in flight while we do this: you write on a branch
of your own.

The sprint: $ARGUMENTS

If nothing follows "The sprint:", take the first sprint in docs/board/BOARD.md whose status is
`landed` — autopilot put it on main — or `built` — every story of it was done by hand; ask me
then whether it is merged and pushed, and go on if I say it is. A sprint that is neither has no
retro yet: say so — for an early look at its code there is `/sprint-review`.

Read: "Where a planning session writes" in docs/PLANNING.md, docs/GLOSSARY.md,
docs/FEATURES.md, docs/CODING_STANDARDS.md and docs/PROGRESS.md. Then the sprint: its
`sprint.md`; its stories, and the **History** of each above all; its `review.md`; its waves —
`grep -l "S-NNN" docs/board/log/*.md`, and in each the Stories, Found, Health and Contexts
lines —; the inputs it waited on, `grep -l "S-NNN" docs/board/inputs/done/*.md`; its commits,
`git log --oneline --grep "(S-NNN" main`. Read source only where a
finding needs it, found with grep and read by range.

Make room first, as docs/PLANNING.md says: a worktree of your own, on `plan/retro-S-NNN`.

**1. What the sprint leaves behind.** Write these:

- **docs/FEATURES.md** — the capability's entry, or the entry the sprint changed, rewritten so
  that it is true today: what a user can do, the rules that must keep holding, where it lives,
  and its sprints. From what was built, not from what was planned: check the review and the
  stories that were dropped.
- **docs/GLOSSARY.md** — a term the spec, the stories or the code brought in that is not there,
  and a word that was used for two things.
- **A decision made on the way and written nowhere** — in a story's report, a History line, a
  line under Decisions that turned out larger. If it is hard to reverse, surprising without
  its context, and a real trade-off: a proposed ADR. Otherwise leave it.
- **What the review left for me.** Go through `review.md`'s findings "for the owner" with me,
  one by one: a story in the inbox, a standard, or nothing.

**2. What would make the next sprint run better.** Collect candidates, show them to me in the
order of what they would save, and write only what I pick:

- **A mistake a tool could have caught** — a fixed pattern, a banned call, the shape of an
  import, a file in the wrong place. It becomes a check, not a sentence: a story in the inbox
  for the lint rule, or the rule of `{{ARCHITECTURE_CHECK}}` with the fixture that proves it
  fires. Never write such a rule into docs/CODING_STANDARDS.md.
- **A mistake it took judgement to see**, which a reviewer missed or caught late — one line in
  docs/CODING_STANDARDS.md, under "This project's standards", with the reason and this
  sprint's id. And take out a line there that a check has since made redundant.
- **A story that was not cold-startable** — a retry, a "blocked by" nobody had planned, an
  implementer whose context peaked far above the others', a story that needed what its Read
  list did not name. What in the writing would have prevented it goes into the commands that
  write stories, in `.claude/skills/`: this project's commands learn from this project.
- **A sprint cut too narrow** — waves of one story where two or three could have run, owned
  paths that collided. Say how it should have been cut; the same commands take the lesson.
- **A question that stopped the sprint and could have been asked when it was planned** — an
  input whose answer I knew all along. What the interview should have asked goes into the
  commands that plan.
- **Something an agent searched for at length** — a pointer in that directory's `CLAUDE.md`,
  as a story: the file belongs to the code.
- **Something learned about the stack** that the next story on it should not have to learn
  again — into that part's skill in `.claude/skills/`, as a rule that carries this sprint's
  id. A line under its "Not yet confirmed" that the sprint settled comes out, or becomes the
  rule the sprint proved (docs/STACK_SKILLS.md). If the sprint worked on a part that has no
  skill, tell me: `/stack-skills` has one written.
- **An instruction that changes nothing**, or has gone stale, in a command or a skill — take it
  out. In the root `CLAUDE.md`, an agent or a protocol document: tell me; those are not yours.

**3. Write `retro.md`** in the sprint's folder: what was built, in two lines; how it went — the
waves, the retries, what was blocked, the review's counts, the largest context; what moved
where, each with the file it went to; and what was proposed, with what I decided.

**4. Close the sprint**: `git mv docs/board/sprints/S-NNN-slug docs/board/sprints/done/S-NNN-slug`.

**5. Land it**: commit as "docs: retro S-NNN", and push the branch — a backup, not a request.
When the branch is brought in — by `/autopilot` at its next wave planning, or by `/implement`
on my yes — the sprint is marked done and its row leaves the board. Tell me that it waits
there, and which sprint is next for a retro.

Never edit docs/board/BOARD.md, docs/board/log/, docs/PROGRESS.md, the root `CLAUDE.md`, a
numbered ADR, source code or a test. What needs one of those becomes a story.
