---
name: standup
description: Say where the project stands and which command comes next - the sprint in flight, what is ready, what waits on the owner, what was planned and is not on the board yet, which sprints wait for their retro. Reads, and changes nothing.
disable-model-invocation: true
---

Tell me where {{PROJECT_NAME}} stands, in one screen, and what I should type next. Change
nothing: no file, no branch, no commit.

Read docs/board/BOARD.md, docs/PROGRESS.md, the newest file in docs/board/log/, and the first
lines of each file in docs/board/inputs/ — its title, Kind, Status and Blocks. Then ask git,
reading only:

```sh
git branch --list "sprint/*" "story/*"    # a sprint in flight, and its stories' branches
git branch -a --list "*plan/*"            # planned, and not merged yet
git worktree list                         # an agent at work holds a locked worktree
git log --oneline -5 main
```

and list docs/board/inbox/. Do not read source code, and do not open the inspector: that is
`/board`.

Then say, in this order, a line or two each, leaving out what is empty:

1. **Now** — the board's Now line.
2. **In flight** — the sprint in progress, how many of its stories are in, the wave being
   built, and whether agents are at work (a locked worktree) or a run has stopped (a sprint
   branch and no locked worktree). And any sprint that is `waiting` or `reviewed` on that
   branch: what is built there is not on main yet.
3. **Waits on you** — changes in the working tree that are not committed: a story built by
   hand, for you to review and commit. Every open input in docs/board/inputs/: its id, what is
   needed in a few words, and the story or sprint it holds up — a `stop` first, since no run
   starts while one is open, then one that holds every landing — and each one you have answered
   that no builder has applied yet. A sprint that is `built`: reviewing, merging and pushing
   it are yours. Findings "for the owner" in the `review.md` of a sprint that has had no
   retro.
4. **Next** — the top three of Ready, and the next planned sprint.
5. **Planned, not on the board yet** — each `plan/` branch and each file in the inbox.
6. **No retro yet** — each sprint whose status is `landed` or `built`.
7. **Type next** — exactly one thing, and why. The first of these that applies:
   - changes are not committed: review and commit them — `/sprint-review uncommitted` reads
     them a second time first;
   - inputs are open: `/resolve`, which takes me through them one by one — say how many, and
     what the first one holds up;
   - inputs are answered and not applied, or a sprint has my yes to land: `/autopilot`, which
     applies them and carries on;
   - a sprint is in flight and nothing is running, or work is ready: `/autopilot` to let it
     run, or `/implement` to build the next story with me — name both, and say which fits what
     is at the top of Ready;
   - a sprint is `landed` or `built` and has had no retro: `/retro S-NNN`;
   - nothing is ready and nothing is planned: `/ideate` with the next idea — or
     `/project-review`, to find out what is worth improving.

Under a screen, in the words of docs/GLOSSARY.md.
