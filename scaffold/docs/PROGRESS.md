---
updated: '{{YYYY-MM-DD}}'
updated_by: 'phase-0' # the sprint lead, or the session that built a story by hand
status: on-track # on-track | blocked | needs-owner
---

# Progress

> **The hand-off file.** A fresh session that has read `CLAUDE.md`, this file and
> `docs/board/BOARD.md` must be able to plan the next wave or pick up the next story without
> asking anything. It is **rewritten**, never appended to: the work is on the board, the history
> is in `docs/board/log/`. Only whoever is building writes it (directive 29).
>
> It has no line limit: keep it as precise and short as possible, with only what is necessary.
> Prune "Last decisions" to five and fold anything older into an ADR.

## Where we are

_[Two or three sentences, written for someone who has never seen this project. What exists and
works right now, and what is deliberately not built yet. Not a changelog — a snapshot.]_

## Sprint in flight

None. The top `planned` sprint in `docs/board/BOARD.md` is what comes next.

_[While a sprint is in flight: its id, its `sprint/S-NNN` branch, how many of its stories are
in, and the words "do not start another". It is on this machine only until it lands.]_

## Last decisions

_[Five at most, newest first, one or two lines each, each pointing at its ADR. Older ones live
only in `docs/adr/`.]_

1. _[decision]_ — `docs/adr/ADR-0001-....md`

## Known debt

_[Things that are true and imperfect. Write them down so the next session does not rediscover
them as bugs. Each line: what, where, and the story that pays it off — or what it would cost.]_

- _[e.g. "`ensureDefault()` scans instead of reading a marker, so two first runs in the same
  second could create two." → S-000.4]_

## Blocked on the owner

_[One line for each open input in `docs/board/inputs/`: its id, what is needed in a few words,
and what it holds up — "`I-007` a mail provider for the share links: holds S-012.4". The file
has the rest, and `/resolve` goes through them. Empty is a good state — say "Nothing" rather
than deleting the heading.]_

- Nothing.

## Environment

| Thing | Value |
| --- | --- |
| Repository | `{{GITHUB_OWNER}}/{{PROJECT_NAME}}`, **private**; GitHub stores it and runs nothing — no Actions, no pull requests (ADR-0009) |
| Landing | on autopilot: one commit per story on the local sprint branch, one merge on `main`, pushed once the sprint is reviewed and finished (ADR-0011). By hand: the owner commits and pushes (ADR-0012). Never a force push |
| Secret scan | TruffleHog in `.githooks/`, on every commit and push — `git config core.hooksPath .githooks` once per clone |
| Parallel agents | at most `max_parallel` in `docs/board/BOARD.md` — `{{MAX_PARALLEL}}`, set by the owner |
| Local path | `{{PROJECT_PATH}}` |
| Runtime | {{LANGUAGE}} — always run through `{{PACKAGE_MANAGER}}` |
| Verify | `{{VERIFY_FAST}}` for agents · `{{VERIFY_COMMAND}}` for the sprint lead, once per wave · all local |
| Secrets vault | `{{SECRETS_VAULT}}` — confirmed with the owner, never in the repo |
| Deploy target | {{HOSTING}} — `{{DEPLOY_COMMAND}}`, by the sprint lead, from `main` after each sprint lands |

## Known limitations of the environment

_[The traps that cost an hour last time: an API that must be enabled by hand, a tool that needs
a specific runtime version, a preview URL that cannot authenticate. Future sessions will hit
exactly these.]_

- A sprint is in flight while a `sprint/` branch exists — check `git branch --list "sprint/*"`
  before starting anything. The branch is local, and so is everything on it.
- Agents work in `.claude/worktrees/`. A worktree left behind by a stopped session is removed
  with `git worktree remove` (after `git worktree unlock` if it is locked and no agent runs).

## Hand-off

Read `CLAUDE.md`, then this file, then `docs/board/BOARD.md`. Sessions start on Opus at high
effort (`.claude/settings.json`). Each of these is typed in a fresh session, or after `/clear`:

- **Where things stand, and what to type next:** `/standup`.
- **Build one story by hand:** `/implement` — it asks which, builds it, and waits for your
  review and your commit. `/implement S-012.3` or `/implement S-012` names it.
- **Let it run:** `/autopilot`, or `/autopilot` and a stop point: sprint after sprint, committed,
  reviewed and landed, until nothing can move.
- **Give it what it waits for:** `/resolve` — through the open inputs, one by one.
- **Add work:** `/feature`, `/fix` and `/refactor` — after an `/ideate`, where it needs thinking
  through — at any time, even while a sprint is being built.
- **Look back:** `/retro` on a sprint that has landed; `/sprint-review` and `/project-review`
  for a second reading of the code.
- **A new part of the stack, or a new major version of one:** `/stack-skills` has its skill
  written or refreshed.
- **See the board:** `/board`, or `node tools/inspector/serve.mjs` in a terminal.
