---
updated: '2026-10-03'
updated_by: 'the orchestrator, wave 12 planned'
max_parallel: 3
land: ask # the owner says yes before a sprint is pushed
current_sprint: S-004 # the sprint in flight
current_wave: 12
next_wave: 13
---

# Board

> A board in today's words (ADR-0011), with a sprint in flight: wave 12 of S-004 is being
> built, a maintenance story rides along, and S-003 has landed and waits for its retro.

**Now:** Boards and search work; sharing is in flight, wave 12 of about 13. A billing account
for the tile host waits on you.

## Sprints

| Sprint | Title | Status | Stories done |
| --- | --- | --- | --- |
| S-000 | Maintenance — bugs, debt, dependency bumps, tooling | standing | 6/9 |
| S-003 | Search | landed | 4/4 |
| S-004 | Share links | in progress | 2/5 |
| S-005 | Due dates | planned | 0/2 |

## In wave

| Story | Title | Model | Branch | State |
| --- | --- | --- | --- | --- |
| S-004.3 | The dialog copies the link | opus | `story/S-004.3-share-dialog` | building |
| S-004.4 | A link can be revoked | opus | `story/S-004.4-revoke` | building |
| S-000.7 | Bump the test runner | sonnet | `story/S-000.7-bump-runner` | building |

## Ready

| Story | Title | Depends on | Owned paths | Solo | Model |
| --- | --- | --- | --- | --- | --- |
| S-004.5 | A revoked link says so | S-004.3, S-004.4 | `apps/web/src/share/**` | no | opus |
| S-005.1 | The due-date port | none | `packages/core/src/due/**` | yes | opus |

## Blocked

| Story | Title | Why | Needs |
| --- | --- | --- | --- |
| S-000.9 | Tiles from the paid host | No billing account | The owner's card |

## Backlog

| Story or sprint | Title | Missing |
| --- | --- | --- |
| S-005.2 | Due dates on a card | owned paths |
| S-006 | Printing | a breakdown |

## Done

| Story | Title | Wave |
| --- | --- | --- |
| S-004.2 | The share port's adapter | 11 |
| S-004.1 | The share port | 10 |
| S-000.6 | One clamp helper | 10 |
