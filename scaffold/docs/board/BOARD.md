---
updated: '{{YYYY-MM-DD}}'
updated_by: 'phase-0' # the sprint lead, or the session that built a story by hand
max_parallel: {{MAX_PARALLEL}} # most sub-agents at once, of any kind — 1 is the sequential workflow
land: auto # for /autopilot — auto: a sprint is pushed and deployed once its review is clean · ask: only on the owner's yes
current_sprint: none # the sprint in flight, as S-NNN
current_wave: none # a number while a wave is being built
next_wave: 1
---

# Board

> **Only whoever is building writes this file** (directive 29): the sprint lead while
> `/autopilot` runs, and otherwise the session of `/implement`, for the one story it built by
> hand. Planning sessions add sprint folders to `sprints/`, and single stories to `inbox/`;
> they are listed here when building next starts. What a sprint or a story *is* lives in its
> files; this board holds only status and order.
>
> To reorder the sprints or Ready, or to change a limit, tell the orchestrator, or edit this
> file yourself between waves — you are the owner. The inspector finds each section by its
> heading and each column by its header: keep those names, whatever else changes.

**Now:** _[One or two sentences for someone who has never seen the project: what works today,
what is being built, and anything waiting on the owner. For example: "Boards and search work;
sharing is in flight, wave 2 of about 3. 2 things wait on you (a Firebase plan choice, an OAuth
screen)." Rewritten every time a sprint lands.]_

## Sprints

The top one that is `planned` is next. Status is one of:

- `planned`, then `in progress`;
- `waiting` — it cannot finish without the owner: "Blocked" below and `docs/PROGRESS.md` say
  what it needs. `/autopilot` builds the next sprint on top of it meanwhile;
- `reviewed` — finished and read by both reviewers, not yet on `main`: it sits on a waiting
  sprint, or the board says `land: ask`;
- `landed` — on `main`, pushed and deployed by `/autopilot`; or `built` — every story done by
  hand, and reviewing, merging and pushing it are the owner's. Both wait for their `/retro`;
- `dropped`, which keeps its row and gains a reason: deleting it only means someone proposes
  it again; and `standing`, for S-000.

A sprint that has had its retro is `done`: its folder is in `sprints/done/` and its row has
left this table.

| Sprint | Title | Status | Stories done |
| --- | --- | --- | --- |
| S-000 | Maintenance — bugs, debt, dependency bumps, tooling | standing | 0/0 |
| S-001 | _[title]_ | planned | 0/3 |

## In wave

Empty while `current_wave` is `none`. State is one of `building`, `checking`, `committed`,
`returned`, `blocked`.

| Story | Title | Model | Branch | State |
| --- | --- | --- | --- | --- |

## Ready

The top is next. A story is here only if it meets the definition of ready
(`docs/AGENT_WORKFLOW.md`).

| Story | Title | Depends on | Owned paths | Solo | Model |
| --- | --- | --- | --- | --- | --- |
| S-001.1 | _[title]_ | none | `{{path}}/**` | yes | opus |
| S-001.2 | _[title]_ | S-001.1 | `{{path}}/**` | no | opus |

## Blocked

"Needs" names the input, `I-NNN`, that says what the owner has to give: one file in `inputs/`.
`/resolve` goes through them; a story comes back to Ready when its input is answered.

| Story | Title | Why | Needs |
| --- | --- | --- | --- |

## Backlog

Not ready yet. Each row says what it lacks — owned paths, a dependency, a breakdown, an answer
from the owner.

| Story or sprint | Title | Missing |
| --- | --- | --- |

## Done

The last 20 stories, newest first. Older ones are in `log/`.

| Story | Title | Wave |
| --- | --- | --- |
