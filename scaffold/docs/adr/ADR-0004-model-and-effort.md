# ADR-0004 — Opus at maximum effort for every task, and a verifier on every task

**Date** {{YYYY-MM-DD}}
**Status** accepted — amended by ADR-0005 (tasks in parallel sprints instead of serial steps),
by ADR-0007 (one verifier per sprint, not one per task), by ADR-0008 (effort `high`, but the
verifier's `max`) and by ADR-0011 (two reviewers per sprint, also at `max`; what is called a
task here is now a story, and a sprint a wave)

## Context

{{PROJECT_NAME}} is built by agents, each task by one agent in a fresh context. The expensive
failures in that setup are not token bills. They are a task that fails and costs a retry, a CI
run and the owner's attention — or worse, a task that passes with a quiet shortcut: a weakened
test, a boundary crossed through a side door, an acceptance criterion read generously. A later
task discovers it, and by then it is part of the foundation.

The first version of this template split work by model to save cost: `opus` for design and
security, `sonnet` for ordinary implementation, `haiku` for mechanical work. The owner chose
quality over cost instead.

Claude Code sets a sub-agent's reasoning effort in its definition (`effort:` in
`.claude/agents/*.md`: `low`, `medium`, `high`, `xhigh` or `max`). The Agent tool can override a
sub-agent's model per call, but not its effort. A session's effort is chosen with `/effort`, and
`max` lasts only for that session — unless the `CLAUDE_CODE_EFFORT_LEVEL` environment variable
sets it, which is the one way to make `max` the default.

## Decision

- **`opus` for every task** — design, implementation, tests, verification, retries.
- **`sonnet` only for super simple, mechanical work** with no judgement in it: renames, file
  moves, formatting, dependency bumps. When in doubt, `opus`.
- **No `haiku`.**
- **Effort `max` everywhere.** The `architect`, `implementer` and `verifier` definitions set
  `effort: max`; every session starts on Opus at `max`, because `.claude/settings.json` sets
  the starting model to `opus` and `CLAUDE_CODE_EFFORT_LEVEL` to `max` — nobody has to remember
  to. A `sonnet` task reuses the `implementer` definition with a model override. _Now `high`,
  and `max` for the verifier alone — see ADR-0008._
- **A verifier on every `opus` task**: after its implementer returns — never alongside it,
  though it may run while other tasks in the sprint are still building — a fresh-context
  `verifier` checks the task adversarially. A `fail` verdict is a failed task. _Now one
  verifier per sprint, after the full verify — see ADR-0007._
- Aliases (`opus`, `sonnet`), never pinned model ids, so the policy follows the newest models.

## Consequences

**Good.** The strongest model, thinking as long as it needs, does the work, and a second one with
no stake in the result checks it. Rules that live in a long rulebook — owned paths, the prime
directives, never weakening a gate — are followed more faithfully, and fewer tasks need a retry.

**Bad.** Usage: Opus at `max` consumes a plan's allowance much faster, and the verifier adds
roughly one agent run per task. Parallel sprints multiply both: `max_parallel` agents consume
the allowance that many times as fast (ADR-0005), and a limit hit mid-sprint stalls every agent
in it. The draft sprint pull request and the board make that recoverable — a fresh orchestrator
reconciles from them — but keep `max_parallel` modest and runs short. Tasks take longer, though
integration and CI still dominate the wall clock.

**Cost to reverse.** Low: the policy lives in `docs/ORCHESTRATION.md`, the **Model** field of the
task cards, the commands, `.claude/settings.json` and three agent definitions.

## Alternatives considered

| Alternative | Why not |
| --- | --- |
| The cost split: opus for design, sonnet for implementation, haiku for mechanical work | Optimizes the cheap part. Most tasks worth a card are the kind where a smaller model's shortcut costs more than it saves. |
| `max` effort for hard tasks, `high` for the rest | Effort is fixed per agent definition, so it needs two implementer definitions kept in sync, for a saving on the tasks that are rarely easy anyway. |
| A verifier only on risky tasks | "Risky" is judged by the same orchestrator that might misjudge it. A verifier on every non-trivial task costs one agent run and removes the judgement call. |
