# ADR-0012 — Two ways to build: `/implement` by hand, `/autopilot` by itself

**Date** {{YYYY-MM-DD}}
**Status** accepted — amends ADR-0011 (the command that builds by itself is `/autopilot`, and a
stuck sprint no longer stops it) and ADR-0005 (relay mode gives way to building by hand);
amended by ADR-0013 (the orchestrator starts a sprint lead for every sprint and builds nothing
itself; a deploy that fails holds the landings and no longer ends the run)

## Context

**Nothing let a person read the work first.** One command built everything by itself:
committed it, reviewed it, landed it. The other, `/next`, built a single story — and committed
and landed that by itself too. Some work has to be read by a person before it is committed:
work the owner answers for to others, a change that is risky or new, a story only the owner
can settle.

**And the command that ran by itself did not run for long.** It stopped and asked whenever one
story needed the owner — a secret, an account, a decision — or failed twice. A run started in
the evening could end ten minutes later, with a board full of work that had nothing to do with
the question.

A first design put a mode on the board, `autopilot` or `corporate`, that every command read.
The owner chose commands instead: the word that is typed says what will happen.

## Decision

**Two commands, and no mode to set.** Both are there in every project, both write the same
board, and a story is done when the board says so, whoever built it.

- **`/implement [a story or a sprint]` — by hand.** It asks what to build if nothing is named:
  the stories of the sprint in progress with their state, the ready ones as choices, and room
  to type any other story or sprint. It builds that one story itself, in the owner's checkout,
  on the branch that is checked out — no sub-agent, no worktree. It changes nothing in git: no
  commit, no push, no branch, no deploy. It decides nothing the story did not decide — before
  a new dependency, a change to a contract, a file outside the owned paths, a change to a
  check, or a choice between two designs, it stops and asks — and it builds nothing that was
  not asked for. It records the story on the board as changes in the working tree, proposes a
  commit message that closes with the story's id, and stops. The owner reads the diff, commits
  and pushes. Given a sprint, it still builds one story at a time and stops after each.
- **`/autopilot [when to stop]` — by itself.** The orchestrator of ADR-0011, which no longer
  stops to ask. What needs the owner is set aside, with what it needs written down, and
  everything that does not depend on it goes on: a story that needs the owner or failed twice
  goes to Blocked; a sprint that cannot finish becomes `waiting`, and the next sprint is built
  on top of it, on the same branch. Nothing on a branch is pushed or deployed while a sprint on
  it is waiting, so the rule of ADR-0011 holds: only what is reviewed and finished leaves the
  machine. The run ends when nothing can move, with one list of what waits on the owner.
- **What waits on the owner is a file.** Each thing only the owner can give — a decision, a
  secret to place, something to set up, a look at a story that failed twice, an approval —
  becomes an input: one file in `docs/board/inputs/`, written for someone who comes back days
  later, with the options or the exact steps. `/resolve` takes the owner through the open ones
  one at a time and writes each answer into its file; it changes nothing else. The builder
  applies the answers at its next start. A secret is never written into an input, or typed
  into a session.
- **It stops at once only where going on could do harm**: a secret found by TruffleHog, a
  failed deploy, anything that would become public, a board that is wrong, a prime directive
  that would have to be broken, or changes in the working tree that are not committed.
  `land: ask` on the board is the one switch that makes it wait for a yes.
- **The two never run at once.** `/implement` stops if a wave is being built or an agent's
  worktree is locked; `/autopilot` stops if the working tree holds changes that are not
  committed, because a story built by hand is then waiting for its review.
- **A sprint built by hand is `built`**, and reviewing, merging and pushing it are the
  owner's. A story built by hand on the orchestrator's own branch leaves its sprint in
  progress, and the orchestrator reviews and lands it like any other.
- **`/next` and relay mode are gone.** One careful story is `/implement`; a cheap run of one
  agent at a time is `/autopilot` with `max_parallel: 1`.
- **Planning stays as it was.** A planning command commits and pushes its own `plan/` branch.
  `/autopilot` merges it at its next wave planning; `/implement` names the branches that wait
  and merges them on the owner's yes.

## Consequences

**Good.** The safe command has the plain name, and autonomy takes the explicit word. Nothing
has to be remembered about a project to know what a command will do in it. A sprint can be
built partly by hand and partly by itself: the story a run got stuck on is exactly the one to
build with `/implement`. A run uses the night: one question no longer ends it. And what it
needed is not a line in a table but a file per question, to go through one by one.

**Bad.** While a sprint waits, nothing built on top of it is pushed: a sprint that waits for
long holds a growing pile of finished work on one machine, and one merge then carries several
sprints. Nothing in the harness stops a session from committing in a project that is meant to
be built by hand, unless the owner moves those permissions to `deny` (`.claude/README.md`). A
planning command still commits and pushes its plan branch. A story built by hand is found in
git only if the owner uses the commit message that was proposed. And the two commands are kept
apart by what they check when they start, not by a lock.

**Cost to reverse.** Low. Two commands and a section of `docs/ORCHESTRATION.md`.

## Alternatives considered

| Alternative | Why not |
| --- | --- |
| A mode line on the board, read by every command | What a command does would depend on a file nobody is looking at, and going back to autopilot would mean a session loosening its own permissions. |
| Parking a stuck sprint and landing the independent ones behind it | Later sprints could go online while one waits, but it needs each sprint in a worktree of its own and a proof that two sprints are independent — much protocol for a case that should be rare. |
| Stopping when a sprint is stuck, as ADR-0011 had it | Simple, and it ends most long runs early. |
| `/implement` making a local commit per story | Fewer steps for the owner, but the point of building by hand is that the owner's commit is the approval. |
| Keeping `/next` | A third way of building, between the two, to keep in step with both. |
| What waits on the owner as lines in `docs/PROGRESS.md`, as before | A line cannot hold the options, the steps or what was tried, and a list in a file that is rewritten every wave is nothing to work through. |
| `/resolve` applying the answers itself | It would write the board while a wave may be running. Whoever builds stays the board's one writer. |
