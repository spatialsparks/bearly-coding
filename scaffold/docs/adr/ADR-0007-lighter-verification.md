# ADR-0007 — Verify the sprint once: one full verify, one verifier, CI without the tests

**Date** {{YYYY-MM-DD}}
**Status** accepted — amends ADR-0004 (one verifier per sprint, not per task) and ADR-0005 (the
full verify once per sprint, not after each merge; CI no longer runs it); amended by ADR-0009
(no CI at all: the secret scan runs in git hooks, and the orchestrator deploys) and by ADR-0011
(what is called a sprint here is now a wave, and the finished sprint is read once more as a
whole, by two reviewers, before it is pushed)

## Context

ADR-0004 and ADR-0005 checked the same work up to four times. An implementer ran the fast
verify on its task. A verifier — a second Opus agent at maximum effort, with an install of its
own — ran it again. The orchestrator ran the full verify after every merge into the sprint
branch. CI then ran the full verify on every push to the sprint's pull request and once more on
`main`.

For a sprint of three `opus` tasks that is six agent runs, three full verifies on the owner's
machine, and three or four in CI: when the draft pull request opens on a commit that changed
only the board, when the sprint is recorded, when the branch is brought up to date, and on the
push to `main`. A planning session's pull request — one Markdown file — paid for two more. And
directive 14 asked for a test for every non-trivial function, whatever the function did.

The owner ran this on a few projects and found it too heavy on tests and on GitHub Actions,
in tokens and in waiting, and chose to check the whole sprint once instead.

## Decision

- **The fast verify stays in every task.** It is the implementer's only feedback before it
  hands back, and it is cheap: no ports, servers, containers or emulators.
- **The full verify runs once per sprint**: by the orchestrator, on the sprint branch, with
  every task merged and `main` merged in. It runs again only after a fix or a revert.
- **One verifier per sprint, not one per task.** After the full verify is green it reads the
  whole sprint — every merged `opus` task against its card, then what only the whole shows —
  and gives a verdict per task. It does not run the suite again. A sprint of `sonnet` tasks
  alone gets none.
- **A task that fails after its merge** — red in the full verify, or the verifier's `fail` —
  gets one fix on the sprint branch. If that fails too, its merge is reverted and the sprint
  lands without it.
- **CI does not run the tests.** Its one required check is `secret-scan`. A deploy job builds
  and deploys from `main`. The `verify` job stays in the workflow and runs only when the owner
  starts it by hand, for a second opinion on a clean machine.
- **Tests go where the logic lives** (directive 14): rules, calculations and decisions in the
  domain and the use cases; every port's contract suite; one end-to-end test per story, of its
  main path. Wiring, pass-through adapter code, views and configuration get none of their own.
  Tests that already exist stay.

## Consequences

**Good.** A sprint of three tasks is four agent runs instead of six, and one full verify
instead of three locally and three or four in CI. A planning session's pull request costs a
secret scan. The verifier sees what a per-task verifier could not: two tasks that built the
same thing, a contract one changed and another still uses the old way. Implementers write fewer
tests, and every later verify runs fewer.

**Bad.** The server no longer enforces the tests. "The full verify was green" is the
orchestrator's word, on the owner's machine — what ADR-0002 called a promise — and a machine
that has a file the repository lacks can keep it green. A failure is found later: after the
merge, where it costs a fix or a revert, not before it, where it cost a retry. Two tasks green
alone and red together no longer name the culprit by the merge that turned red; the
orchestrator maps the failing files to owned paths, or backs merges out newest first. One
verifier across several tasks looks less closely at each. Code with no test of its own is held
only by the types and the story's one end-to-end path. And a dependency bot's pull request is
green on the secret scan alone, so it must go through a sprint to be tested at all.

**Cost to reverse.** Low, and piece by piece: remove the `if` from the `verify` job and add it
back to the required checks; spawn the verifier in move 5 again; run the full verify inside
each merge.

## Alternatives considered

| Alternative | Why not |
| --- | --- |
| Keep the full verify in CI, once per sprint, when the pull request is readied | Keeps the server-side gate for one run. But it repeats a run that just passed locally, and Actions minutes and waiting were the complaint. The manual run is there when a second opinion is wanted. |
| Drop the fast verify from tasks and test only at sprint end | The errors of every task then surface together, after the merge, and untangling them costs more agent runs than the check saved. |
| A verifier per task for Solo tasks only | A solo task is a sprint of its own, so the sprint's verifier already is its verifier. |
| No verifier at all | A test proves only what it asserts. A weakened gate and a criterion read generously are what a fresh reader catches (ADR-0004), and one run per sprint is what that now costs. |
| No rule on tests at all | The sprint's one full verify catches only what a test asserts. Without tests on the logic it is a build check. |
