---
updated: '2026-03-02'
updated_by: 'the orchestrator, sprint 7 planned' # the orchestrator, or a relay session
max_parallel: 3 # most sub-agents at once
max_open_stories: 3
current_sprint: 7 # a number while a sprint is in flight
next_sprint: 8
---

# Board

> A board after a few months of use: an orchestrator has aligned the tables, grouped finished
> stories into one row, written prose into cells and added a section of its own.

## Milestones

| Milestone | Delivers        | Stories          | Done when                                  |
| --------- | --------------- | ---------------- | ------------------------------------------ |
| M0        | Foundation      | ST-001, ST-002   | Done: no merge without a green `make all`  |
| M1        | Maps            | ST-101 to ST-103 | A saved map opens on a second device       |
| Later     | The parking lot | -                | Nothing there is scheduled                 |

## Stories

A finished milestone's stories share a row.

| Story          | Title                               | Milestone | Status      | Tasks done                  |
| -------------- | ----------------------------------- | --------- | ----------- | --------------------------- |
| ST-000         | Maintenance: bugs, debt, tooling    | -         | standing    | 2/9                         |
| ST-001, ST-002 | Walking skeleton; foundation        | M0        | done        | before the board            |
| ST-101         | Layers                              | M1        | in progress | 1/4, and two steps before   |
| ST-102         | Sharing a map \| by link            | M1        | backlog     | 0/2                         |

## In sprint

Empty while `current_sprint` is `none`.

| Task     | Title                                    | Model  | Branch                        | State    |
| -------- | ---------------------------------------- | ------ | ----------------------------- | -------- |
| T-101.2  | The layer list reorders by drag          | opus   | `task/T-101.2-layer-reorder`  | building |
| T-000.4  | The tile cache survives a restart        | opus   | `task/T-000.4-tile-cache`     | building |
| T-000.5  | Bump the test runner                     | sonnet | `task/T-000.5-bump-runner`    | building |
| T-101.3  | A layer's opacity slider                 | opus   | `task/T-101.3-opacity`        | returned |

## Ready

The top is next.

| Task    | Title                                    | Depends on       | Owned paths                                         | Solo | Model  |
| ------- | ---------------------------------------- | ---------------- | --------------------------------------------------- | ---- | ------ |
| T-101.4 | Layers remember their order              | T-101.2          | core's `layerOrder`, `app/container.ts`             | yes  | opus   |
| T-000.6 | One `clamp` helper                       | none             | `apps/web/src/ui/{clamp,Slider}*`                   | no   | sonnet |
| T-102.1 | The share port, fake and contract        | T-000.3, T-101.1 | `packages/core/src/ports/share.ts`, the lockfile    | yes  | opus   |

## Blocked

| Task    | Title                 | Why                          | Needs                         |
| ------- | --------------------- | ---------------------------- | ----------------------------- |
| T-102.2 | Share links by e-mail | No mail provider chosen yet  | The owner's call on a provider |

## Backlog

| Task or story | Title                          | Missing                          |
| ------------- | ------------------------------ | -------------------------------- |
| T-000.7       | End to end on a second device  | A design, then its owned paths   |
| ST-103        | Offline maps                   | A breakdown into task cards      |

## Owner gates

A section this inspector has never heard of. It must not break anything.

| Gate | Needs            |
| ---- | ---------------- |
| G1   | A billing account |

## Done

The last 20 tasks, newest first.

| Task    | Title                           | Sprint | PR  |
| ------- | ------------------------------- | ------ | --- |
| T-000.3 | The linter knows the test files | 6      | #41 |
| T-101.1 | The layer port and its fake     | 5      | #39 |
