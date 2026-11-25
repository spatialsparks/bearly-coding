# ADR-0005 — Sprints: independent tasks in parallel worktrees, one pull request per sprint

**Date** {{YYYY-MM-DD}}
**Status** accepted — supersedes ADR-0002; amended by ADR-0007 (the full verify once per sprint,
not after each merge, and CI no longer runs it), by ADR-0009 (no pull requests: a sprint
lands as one squash commit made locally, and its pushed `sprint/NN` branch is the lock) and by
ADR-0011 (what is called a story here is now a sprint, a task a story, and a sprint a wave; one
sprint in flight on a local branch, a commit per story, and one merge per sprint once it is
reviewed), by ADR-0012 (relay mode gives way to building by hand, with `/implement`) and by
ADR-0013 (agents report to the sprint lead that started them; they no longer message each
other)

## Context

ADR-0002 made delivery serial: one step, one branch, one pull request, one agent at a time. It
bought a gate the server enforces and a progress file with exactly one writer. It cost
wall-clock time — independent work waited in line, and every step paid for a CI run of its own —
and it tied the build to a list written once in `PLAN.md`, so adding a feature meant re-planning.

The owner wants the project run more like a team: a board of stories and tasks, sprints of as
many agents as the work allows, features added as new stories while sprints run, agents able to
tell each other about a bug, and a few lines per sprint saying how it went.

ADR-0002 rejected parallel worktrees for three reasons. Each now has an answer:

| ADR-0002's objection | The answer |
| --- | --- |
| The shared context files conflict | They have one writer. Only the orchestrator writes `BOARD.md`, `SPRINT_LOG.md`, `PROGRESS.md`, the root `CLAUDE.md` and ADR numbers. Tasks never touch them, and planning sessions only ever add new story folders. |
| The ledger has no single writer | Same answer: the orchestrator. Task ids are scoped to their story (`T-012.3`), so two planning sessions cannot hand out the same one. |
| A cold start reads a `PROGRESS.md` that describes none of the branches | The board records the sprint in flight — every task's branch and state — and the draft sprint pull request says the same on GitHub. A fresh orchestrator reconciles from the two (`docs/ORCHESTRATION.md`, move 1). |

And Claude Code now isolates sub-agents in git worktrees natively, refusing their edits and
commands in the main checkout — isolation the protocol no longer has to hope for.

## Decision

- **The board** is `docs/board/`: a folder per story — `story.md`, which is also the spec, plus
  one card per task — with `BOARD.md` for status and order and `SPRINT_LOG.md` for history,
  and `inbox/` for a single card added on its own, which the orchestrator numbers when it files
  it. It replaces `PLAN.md`, `FEATURES.md`, `HISTORY_LOG.md`, `docs/specs/` and `docs/tasks/`.
- **A sprint is 1 to `max_parallel` tasks (default 3), chosen mechanically** (directive 29):
  every dependency done, owned paths pairwise disjoint, and a solo task — one that changes a
  contract — always alone. Tasks may come from different stories; at most `max_open_stories`
  (default 2) stories are in progress at once.
- **Each implementer works in its own worktree** on `task/<id>-<slug>`, runs only the fast
  verify, and commits on its own branch. It never pushes, merges or edits the board.
- **The orchestrator integrates.** It merges each finished task into `sprint/NN` one at a time
  and runs the full verify after each merge, aborting any merge that turns it red. Only the
  orchestrator runs the full verify, and only one at a time. _Now once per sprint, on the whole
  — see ADR-0007._
- **One pull request per sprint**, squash-merged when the required checks pass; one sprint in
  flight (directive 26). The draft pull request, opened when the sprint is planned, is the
  sprint's live status and the lock that stops a second sprint starting. _Now a local squash
  commit, with the pushed `sprint/NN` branch as the lock — see ADR-0009._
- **Agents may message each other and the orchestrator**, but nothing is correct only because a
  message was read: anything actionable becomes a card. **No agent ever waits on another** — a
  dependency nobody planned sends the task back to the board.
- **Agent teams are switched off** in the project settings, and every Agent call in the protocol
  passes `isolation: "worktree"` itself, because a named sub-agent otherwise becomes a teammate
  in the shared checkout.
- **Relay mode stays**: a sprint of exactly one task, done by the session itself.

## Consequences

**Good.** Independent work runs at once, and a sprint pays for one CI run instead of one per
task. Features join the board at any time without re-planning anything. A semantic conflict —
two tasks green alone, red together — is caught at the merge that causes it, which also names
the culprit. A failed task is dropped from its sprint rather than sinking it. The owner reads
the project's progress in `SPRINT_LOG.md`, and a running sprint's state on its draft pull
request — or in the inspector (ADR-0006).

**Bad.** Usage scales with parallel agents: three Opus agents at maximum effort reach a plan's
limit three times as fast, and a limit hit mid-sprint stalls every agent in it — `max_parallel`
is the dial. The orchestrator's protocol is now the most complex thing in the template, and an
agent follows a complex protocol less faithfully than a simple one; that is why every rule in it
is mechanical. The fast/full split means a task can pass alone and fail at integration, costing
a retry an earlier full verify would have avoided. `main` gets one squash commit per sprint
rather than per task — the per-task commits stay visible in the sprint pull request. Every
worktree installs its own dependencies. A sprint lands when its slowest task has returned. And
the model has not yet run on a real project: the first one to use it should expect to amend it.
_It has since, and was amended: ADR-0007._

**Cost to reverse.** Low. It is process, not code. `max_parallel: 1` already gives serial
sprints; going all the way back to ADR-0002 means restoring its files from history.

## Alternatives considered

| Alternative | Why not |
| --- | --- |
| Serial pull requests (ADR-0002) | Correct and simple, but slow, and its plan is a fixed list. Still available in spirit: set `max_parallel` to 1. |
| One pull request per task, merged one after another at sprint end | Keeps a preview per task, but strict branch protection makes every merge re-verify against the new `main`: N serialized CI runs per sprint, and the sprint lands task by task instead of as one verified whole. |
| Claude Code agent teams | A shared task list and a mailbox out of the box — but teammates share one checkout, the feature is experimental, teammates do not survive a session resume, and the task list lives in `~/.claude`, not in the repository. |
| Agents that wait for each other's messages | The waiting agent builds on work that is unmerged, unverified and in another worktree; if that work then fails verification, both tasks are lost. A dependency belongs on the board, where the orchestrator schedules it. |
| The board in GitHub Issues and Projects | A real drag-and-drop board, but every read needs the network and a token scope, and the task definitions would live outside the code's history — exactly where a cold-start agent reads worst. |
| Sprints drawn from one story at a time | Cleaner per-feature summaries, but most stories have few independent tasks, so most sprints would run a single agent. |
