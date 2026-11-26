---
name: stack-skills
description: Have the skill for one or more parts of this project's stack written or refreshed - one skill writer per part, side by side, from that part's own documentation - and committed on a plan branch. Safe while a sprint is being built.
argument-hint: '[the parts, or nothing for every part that has no skill yet]'
disable-model-invocation: true
---

Have stack skills written for {{PROJECT_NAME}}, as `docs/STACK_SKILLS.md` says. A sprint may be
in flight while we do this. That is fine: you only ever write skill folders, on a branch of
your own.

The parts: $ARGUMENTS

Read: `docs/STACK_SKILLS.md`, `CLAUDE.md`, `docs/ARCHITECTURE.md`, `docs/PLANNING.md` ("Where a
planning session writes"), and the names and descriptions of what is in `.claude/skills/` —
whatever of these this session has not read already.

1. **Decide which parts.** The ones I named. If I named none: every part of the stack that has
   no skill yet. A part that has one is refreshed only if I named it.
2. **Show me the list**, as step 2 of "Having skills written" has it: each part, its version,
   the documentation site its writer will read, and whether it is new, a refresh, or starts
   from a draft in `.claude/skill-drafts/`. Change what I ask.
3. **Make room**, as "Where a planning session writes" in `docs/PLANNING.md` says: a worktree
   of your own, on `plan/skills-<slug>`.
4. **Start one skill writer per part**, side by side, at most `max_parallel` at once
   (`docs/board/BOARD.md`). Each brief names the full path of the file in your worktree.
   In the default and accept-edits modes, Claude Code will ask me before a writer reads a site
   and before a skill is written; in auto mode a background check decides, and in bypass mode
   nothing asks. Do not work around a refusal, whoever made it.
5. **Check each skill** and **show me** one line per skill with what is not yet confirmed, as
   steps 5 and 6 there have it. Change what I ask.
6. **Land it**, as `docs/PLANNING.md` says: commit only the skill folders, as
   "docs: stack skills — <the parts>", and push the branch — a backup, not a request. Tell me
   that it waits there until it is brought in — `/autopilot` merges it at its next wave
   planning, `/implement` offers to.

Never add an allow rule for a website or for writing skills to `.claude/settings.json`. Never
edit a command, an agent, `docs/board/BOARD.md`, `docs/PROGRESS.md`, source code or a test.
