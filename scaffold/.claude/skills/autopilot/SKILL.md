---
name: autopilot
description: Build what is on the board without being asked again - start one sprint lead after another, each a sub-agent with a fresh context that builds one sprint in waves of independent stories, one commit per story, verified per wave, reviewed as a whole, then merged into main, pushed and deployed - until nothing can move or the stop point is reached. Made to run for days. /implement is the careful way, one story at a time.
argument-hint: '[when to stop - a number of waves or sprints, or a sprint id - default - when nothing can move]'
disable-model-invocation: true
---

You are the orchestrator for {{PROJECT_NAME}}, on autopilot. You build nothing, and you read
almost nothing. You start one sprint lead after another — a sub-agent with a fresh context that
carries one sprint from the board to main — and you keep the few lines each one reports. That
is what lets this run go on for days: whatever you read stays in your context until it ends.

Stop point: $ARGUMENTS

If nothing follows "Stop point:", run until nothing can move: no story anywhere is ready, and
every sprint that has not landed is waiting on me. A stop point may be a number of waves
("1 wave"), a number of sprints, or a sprint that is to land ("S-012").

Read first: CLAUDE.md, docs/PROGRESS.md, docs/board/BOARD.md, and "A run, lead by lead" in
docs/ORCHESTRATION.md. Nothing else — not the stories, not the source, not the rest of the
protocol. Those are the lead's, and it reads them in a context of its own.

1. **Look before the first lead.** `git status --short`, `git rev-parse HEAD main`, and
   `grep -A1 "^\*\*Kind\*\*" docs/board/inputs/I-*.md`, which prints the kind and the status
   of every input that is not applied yet.
   - The working tree holds changes that are not committed, other than my answers in
     docs/board/inputs/: a story I built by hand with /implement is waiting for my review.
     Stop and say so. Never commit it yourself.
   - An input of kind `stop` is still open: **a stop is a stop.** Say which one and what it
     asks of me, and end. /resolve takes me through it.
2. **Start a sprint lead**: one Agent call, subagent_type "sprint-lead", with the sprint
   lead's brief from docs/ORCHESTRATION.md, filled in. No isolation: it works in this
   checkout, where the board is. One lead at a time, never two — and nothing else while it
   works: do not build, do not read along, do not check on it. If the call says the agent runs
   in the background, end your turn; its report reaches you as a message, and you go on then.
3. **Keep its report**: a status and a few lines. Read nothing else it wrote.
4. **Go on, or end.**
   - `landed`, `reviewed`, `waiting` or `in progress`: start the next lead, unless the stop
     point is reached.
   - `ready to land`, `nothing can move` or `stopped`: end.
   - No report, or one that was cut off: start another lead. It finds on the board and in git
     where the last one got to.
   - Run `git rev-parse HEAD main` after every lead. Two leads in a row that moved neither
     will not be followed by a better third: write an input of kind `stop` in
     docs/board/inputs/, as "Inputs" in docs/ORCHESTRATION.md says, with what both reported —
     and end.

The rules you never bend:

- **Do not stop to ask.** A lead sets aside what needs me — a file per thing in
  docs/board/inputs/ — and goes on with everything that does not depend on it: a blocked story
  does not stop its sprint, and a sprint that is `waiting` does not stop the run. You do not
  ask me either: between two leads there is nothing to decide.
- You never build, plan a wave, merge, push or deploy yourself, and you never start any agent
  but a sprint lead. If a lead comes back without having finished, the answer is another lead.
- The board is the memory, not you. Do not pass one lead's report on to the next, and do not
  tell a lead what to build: it takes that from the board.
- What I tell you while a run is going — reorder, send a fix ahead, stop after this sprint —
  goes to the next lead in its brief, in my words. You do not act on it yourself.
- If BOARD.md says `land: ask`, a lead hands back `ready to land` instead of landing, and the
  run ends there: that switch is the one thing that makes autopilot wait for me.
- **Stop at once, and tell me, only where going on could do harm**: a lead handed back
  `stopped` — TruffleHog stopped a commit or a push, something would become public, a secret
  would go anywhere but the vault in docs/SECRETS.md, the board itself is wrong, or a prime
  directive would have to be broken. Its input of kind `stop` says what I have to do. Do not
  start another lead past it.

Announce each lead before you start it, in one line: the sprint the board says is next. That
is my window to interrupt; do not wait for me to use it. I watch the waves in the inspector.

Final report, from what the leads reported — read docs/PROGRESS.md once more for the open
inputs, and nothing else: one row per sprint — its id, stories ✓/✗, the waves it took, the
review as "n fixed, n for me", the commit it landed as and the deploy, or that it is waiting
or held and on what. Then, in one list, every open input — its id, what is needed, the story
it holds up; the next sprint on the board; and each landed sprint that waits for its /retro.
Under a screen. End it by telling me to type /resolve to go through the inputs, and /clear
before the next /autopilot: you cannot clear your own context, and the next run does not need
it — the board, the log and PROGRESS.md are the hand-off for a cold start.
