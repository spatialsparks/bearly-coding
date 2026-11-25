# ADR-0002 — Every step lands as its own pull request, one at a time

**Date** {{YYYY-MM-DD}}
**Status** superseded by ADR-0005 — kept as the record of why delivery started serial, and of
the three objections to parallel work that ADR-0005 answers

## Context

{{PROJECT_NAME}} is built one step at a time by agents that start cold. Two things have to be
true for that to work: the gate that decides whether a step is finished must be one an agent
cannot talk its way past, and `docs/PROGRESS.md` — the file every cold start reads first — must
be written by one actor at a time, so it can be trusted.

A local `{{VERIFY_COMMAND}}` is a promise: the agent says it ran it. A required status check on
a protected branch is a gate: nothing reaches `main` without it. And parallel work — several
agents, several branches, integration merges — makes the step ledger a guess about which
branch is where.

## Decision

After Phase 0, every step is one branch `step/SNN-slug` and one pull request, squash-merged
automatically once the required checks (`verify`, `secret-scan`) pass. Only one step is in
flight: the next starts from a freshly pulled `main` after the previous one merged.

The step's own pull request carries its `docs/PROGRESS.md`, `docs/FEATURES.md` and
`docs/HISTORY_LOG.md` updates, so a merged step is always recorded and `main` is always
cold-startable. The ledger names the pull request rather than a commit, because a squash merge
creates the commit only at merge time.

Agents never push to `main`, never merge with `--admin`, and never touch branch protection;
`.claude/settings.json` denies all three. Phase 0 builds the foundation directly on `main`,
because there is nothing to protect yet, and its last step sets the protection up
(`docs/ORCHESTRATION.md`).

## Consequences

**Good.** The gate is enforced by the server, not by the agent's honesty. Every step can get a
preview deploy a verifier can open. A failed step is an unmerged branch, which costs nothing to
throw away. The history on `main` is one conventional commit per step.

**Bad.** No parallelism: wall-clock time per step includes a CI run, and independent steps wait
for each other. Recording a step takes one extra commit after the pull request exists. If merges
deploy, every step must leave the product working — there is no integration branch to hide a
half-built feature in. Branch protection on a private repository needs a paid GitHub plan.

**Cost to reverse.** Low. This is process, not code: going back to direct commits means editing
`docs/ORCHESTRATION.md`, `docs/AGENT_WORKFLOW.md`, the prompts and the branch protection.

## Alternatives considered

| Alternative | Why not |
| --- | --- |
| Commit directly to `main` after a local verify | The gate becomes a promise. Nothing stops a step that skipped or weakened the verify from landing, and there is no preview to look at before it does. |
| Parallel worktrees, one pull request each, integration pull requests for shared files | Faster on paper. In practice the shared context files conflict, the ledger has no single writer, and a cold start reads a `PROGRESS.md` that describes none of the branches. |
| Stacked pull requests | Parallelism by another name, plus rebasing a chain of branches every time one changes. Worth it for a team; not for one owner and one agent. |
