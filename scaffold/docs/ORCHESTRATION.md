# Orchestration

How work moves from the board to `main`. Everything here rests on one property: **every story
is executable from a cold start**, because its file and the sprint it belongs to say everything
it needs (`docs/AGENT_WORKFLOW.md`). The decisions behind this file are ADR-0005, ADR-0009,
ADR-0011, ADR-0012 and ADR-0013: everything runs on this machine, a sprint leaves it only when
it is reviewed and finished, GitHub only stores the result, there are two ways to build — by
hand, and on autopilot — and on autopilot every sprint has a sprint lead of its own.

```
planning sessions --> plan/<slug> branches        a sprint folder, an inbox story, a term
                              |
orchestrator                  |    the session /autopilot runs in: it builds nothing, and
    |                         |    starts one sprint lead after another
    v                         |
sprint lead: start sprint <---+    a fresh context each; sprint/S-012 cut from main
    |
    +-- a wave: the ready, independent stories, at most max_parallel
    |     +--> implementer S-012.1 --+   one git worktree each, test first, fast verify
    |     +--> implementer S-012.2 --+   each reports what it built, and what it found
    |     +-- check each: owned paths, secrets
    |     +-- integrate: one commit per story on sprint/S-012
    |     +-- verify the wave, once: the full verify, then one verifier for all of it
    |     +-- record: board, log/wave-NNNN.md, PROGRESS.md, ADR numbers
    |   ...the next wave, until every story of the sprint is in
    |
    +-- review the sprint, once: two reviewers side by side, Spec and Standards
    +-- fix what must be fixed, as stories of the sprint
    +-- land: merge into main -> push (TruffleHog) -> deploy
    +-- hand back to the orchestrator, in a few lines: landed, waiting, stopped
```

| | By hand — `/implement` | On autopilot — `/autopilot` |
| --- | --- | --- |
| Who picks the work | The owner: a story or a sprint, asked for every time | A sprint lead, in the board's order |
| Who writes the code | The session itself, in the owner's checkout, on the branch that is checked out | One implementer sub-agent per story, each in its own worktree |
| How much per run | One story, then it waits | Sprint after sprint, each with a fresh sprint lead, until nothing can move |
| Who commits, merges, pushes, deploys | The owner. The session changes nothing in git | The sprint lead |
| A command the settings do not allow | The session asks the owner | Refused at once: the agent does without it, or its story is blocked with an input |
| A decision the story did not fix | The session stops and asks | A proposed ADR, and the work goes on |
| Something noticed on the way | Named in the report, and left alone | Becomes a story |
| Use it when | A person is to read the work before it is committed: it is risky, novel, or yours to answer for | The board has ready work and you want it done |

There is no mode to set: the command says which it is, and both are there in every project.
`/implement` is the careful one and the default; autonomy takes the explicit word. Both write
the same board, and a story is done when the board says so, whoever built it — so a sprint can
be built partly by hand and partly on autopilot. Everything below, up to "By hand", is the
protocol of `/autopilot`. Every session starts on Opus at high effort: `.claude/settings.json`
pins both (ADR-0004, ADR-0008).

**Two agents share the orchestrating** (ADR-0013), so that a run can last for days:

- the **orchestrator** is the session `/autopilot` was typed in. It builds nothing and reads
  almost nothing: it starts one sprint lead after another, and keeps the few lines each one
  reports ("A run, lead by lead");
- a **sprint lead** is a sub-agent with a fresh context that carries one sprint through "A
  sprint, move by move": it plans the waves, starts the implementers, makes one commit of each
  story, verifies, has the sprint reviewed and lands it.

Where another document of this project says what the orchestrator does to the board, the log
or `main` — it numbers a story, merges a plan branch, records a wave, deploys — a sprint lead
does it, for the orchestrator. Turning autopilot on is typing `/autopilot`; turning it off is
stopping that session. Nothing else keeps running, and nothing starts by itself later.

**Checked at two heights, each once** (ADR-0007, ADR-0011). An implementer runs the fast verify
on its own story. The full verify runs once per wave, on the sprint branch with every story of
the wave committed; one verifier then reads the wave against its stories. When the sprint's
last story is in, two reviewers read the whole sprint — one against its spec, one against the
project's standards — before anything is pushed. Nothing runs on GitHub: no Actions, no pull
requests (ADR-0009). TruffleHog checks every commit and every push in the git hooks of
`.githooks/`.

**Planning never waits for building.** A planning session — `/ideate`, `/feature`, `/fix`,
`/refactor`, `/retro` and the two reviews — can add work while a sprint is
built: it writes on a `plan/` branch of its own and never in a checkout the sprint is using
(`docs/PLANNING.md`). The sprint lead merges that branch into `main` at its next wave planning,
so `main` has one writer. With no run going, `/implement` names the plan branches that wait and
merges them on the owner's yes.

**A fresh context for every sprint** (ADR-0008, ADR-0013). A sprint lead starts with nothing
but its brief: the board, the log and `docs/PROGRESS.md` are the hand-off for a cold start. So
no sprint is built in a context that still carries the one before it, and the orchestrator's
own context gains a few lines per sprint, not a sprint's worth of planning, merging and
verifying. A lead hands back after three waves at the latest: a sprint that is not finished by
then gets a fresh lead, which finds on the board and in git where the last one got to (move 1).
Should a context fill all the same, Claude Code compacts it at 400k tokens (`autoCompactWindow`,
in `.claude/settings.json` and in the sprint lead's definition), and a hook in the settings
tells the session to read its command and this file again rather than trust the summary. The
orchestrator still cannot clear its own context, so its final report asks the owner to type
`/clear` before the next `/autopilot`.

---

## The parallel limit

`max_parallel`, in the frontmatter of `docs/board/BOARD.md`, is **the most sub-agents a sprint
lead runs at once, of any kind** — implementers, architects, retries. The lead itself is not
counted: there is always exactly one. The owner sets the number in Phase 0 and can change it at
any time. Each story holds one slot from its implementer through its retry, and those run one
after the other, so `max_parallel` is also the most stories in a wave. A wave's one verifier
and a sprint's two reviewers run when the building is over.

**`max_parallel: 1` is the sequential workflow**: one agent at a time, one story per wave —
and planning sessions can still add sprints while it runs. Usage scales with the number: three
Opus agents reach a plan's limit three times as fast as one, and a limit hit mid-wave stalls
every agent in it.

One sprint is in flight at a time, so how wide a wave can be is decided when the sprint is
sliced: a contract first, then stories with disjoint owned paths (`docs/AGENT_WORKFLOW.md`).

---

## The rules that make parallel work safe

These are directive 29, spelled out. They are mechanical on purpose: a sprint lead can follow a
rule it can check, and cannot reliably follow one that needs judgement.

1. **Independence is computed, never judged.** A story joins a wave only if
   - every story in its **Depends on** is `done` — committed on the sprint branch, or landed
     with an earlier sprint;
   - its **Owned paths** overlap no owned path of a story already in the wave. Compare the
     globs; a directory glob covers every file under it, and two globs overlap if any file
     could match both;
   - it is not **Solo**. A solo story changes a contract — a port, a shared type, the storage
     format, the public surface of a shared module, the dependency ledger — and runs in a
     wave of its own.

   If the lead cannot tell, the story waits for the next wave.
2. **Shared files are owned paths too.** A story that must touch the lockfile, the composition
   root, a registry, the migrations folder or a directory's `CLAUDE.md` lists it under owned
   paths, and rule 1 serializes it against every other story that does. There is no other
   mechanism.
3. **One worktree per agent.** Every implementer, verifier, reviewer and architect runs with
   `isolation: "worktree"` on the Agent call itself. Nobody but the sprint lead works in the
   main checkout, and there is one lead at a time.
4. **Two verify tiers.** `{{VERIFY_FAST}}` — typecheck, lint, the architecture check, unit tests;
   no ports, servers, containers or emulators — is safe to run many times at once, and it is
   the only gate agents run. `{{VERIFY_COMMAND}}` — the fast verify, then the contract suites,
   the build and the end-to-end tests — is run **only by the sprint lead, once per wave**,
   on the sprint branch with every story of the wave committed, and again only after a fix or a
   revert.
5. **One writer for shared state.** While autopilot runs, only the sprint lead writes
   `docs/board/BOARD.md`, `docs/board/log/`, a sprint's `review.md`, `docs/PROGRESS.md`, the
   root `CLAUDE.md` and ADR numbers. Planning sessions add sprint folders, inbox stories,
   glossary terms and proposed ADRs on their own branches, and never edit `BOARD.md`. Agents
   write proposed ADRs to `docs/adr/proposed/`. Built by hand, the session of `/implement`
   writes those files instead, one story at a time, and the owner commits them — which is why
   the two never run at once.
6. **Nobody waits on anybody.** An agent that finds it needs another story's result stops,
   reports `blocked by <id>: <why>` and hands back. The lead adds the dependency and
   reschedules the story. Only two ever wait: a lead for its agents, and the orchestrator for
   its lead.
7. **One branch in flight, and it stays here until it lands.** A `sprint/` branch means sprints
   are being built on it: the one that opened it, whose name it keeps, and — if that one got
   stuck — the ones built on top of it. It is local: nothing on it is pushed or deployed before
   every sprint on it is reviewed and finished. One lead builds on it at a time, and no second
   run starts another.

---

## A run, lead by lead

What the orchestrator does — the session `/autopilot` was typed in. It is short on purpose:
whatever the orchestrator reads stays in its context for the whole run.

1. **Look before the first lead.** `git status --short`, `git rev-parse HEAD main`, and
   `grep -A1 "^\*\*Kind\*\*" docs/board/inputs/I-*.md`, which prints the kind and the status
   of every input that is not applied yet.
   - Changes that are not committed, other than the owner's answers in `docs/board/inputs/`: a
     story built by hand is waiting for the owner's review. Stop and say so.
   - An input of kind `stop` that is still open: a stop is a stop. Say which, and end.
2. **Start a sprint lead**: one Agent call, `subagent_type: "sprint-lead"`, with the sprint
   lead's brief below. No `isolation`: the lead works in the main checkout, where the board
   is. One lead at a time, and nothing else while it works. Where Claude Code starts the lead
   in the background, the orchestrator ends its turn and goes on when the report arrives.
3. **Keep its report** — a status and a few lines, in the shape move 11 gives — and read
   nothing else the lead wrote.
4. **Go on, or end.**
   - `landed`, `reviewed`, `waiting`, `in progress` → the next lead, unless the stop point is
     reached: a number of waves, a number of sprints, or a sprint that is to land;
   - `ready to land`, `nothing can move`, `stopped` → the final report;
   - no report, or one that was cut off — a usage limit, a crash — → another lead. It finds on
     the board and in git where the last one got to (move 1);
   - `git rev-parse HEAD main` after every lead. Two leads in a row that moved neither will not
     be followed by a better third: the orchestrator writes an input of kind `stop` with what
     both reported, and ends.

The orchestrator never builds, plans a wave, merges, pushes or deploys, and it starts no agent
but a sprint lead. It does not pass one lead's report on to the next: the board is the memory.
What the owner tells it while a run is going — reorder, send a fix ahead, stop after this
sprint — it passes to the next lead in its brief, in the owner's words, and does not act on
itself. **Turning autopilot off is stopping this session**: a lead that is cut off in the
middle leaves its sprint on the branch, and the next run carries on with it.

---

## A sprint, move by move

What a sprint lead does. It starts cold, so it starts here every time.

### 1. Sync and reconcile

```sh
git fetch --prune
git branch --list "sprint/*"
grep -A1 "^\*\*Kind\*\*" docs/board/inputs/I-*.md    # the kind and the status of each input
```

- **An input of kind `stop` that is still open**: a stop is a stop. Build nothing, and hand
  back `stopped`, naming it. One the owner has answered is applied in move 2, and building
  goes on.
- **Changes that are not committed** (`git status --short`), other than the owner's answers in
  `docs/board/inputs/`, which move 2 commits: a story built by hand is waiting for the owner's
  review. Hand back `stopped` and say so. Never commit it yourself.
- **No `sprint/` branch**: nothing is in flight. `git switch main && git pull --ff-only`.
- **A `sprint/` branch**: sprints are in flight on it — an earlier lead's, or what a previous
  run left. `git switch sprint/S-NNN` and carry on from its `BOARD.md`. What the board
  says is done is done, whoever built it: a story built by hand has its row in Done and no
  branch of its own.
  - `current_wave` is a number: that wave was being built. Each story in the "In wave" table
    with a commit on the branch that names its id
    (`git log main..HEAD --format=%s | grep -F "(S-012.3)"`) is in; one with a `story/` branch
    that has commits goes on to move 6; one without goes back to Ready. Then carry on from the
    first move that is not done.
  - `current_wave` is `none` and stories of the sprint in progress are left: move 2.
  - every story of it is done: move 9 if the sprint has no `review.md`, the fix wave if that
    names a must-fix that is still open, and move 10 otherwise.
  - no sprint is in progress, sprints on the branch are `reviewed`, and nothing holds them any
    longer — none on it is `waiting`, no deploy that failed holds the landings: move 10.
  - no sprint is in progress, and one is `waiting`: move 3.
- **Leftover worktrees**: `git worktree list`. Remove each one under `.claude/worktrees/` whose
  story is finished or returned with `git worktree remove <path>` (`git worktree unlock <path>`
  first if git says it is locked and no agent is running) — and each `plan-` worktree a planning
  session left behind, once move 2 has merged its branch.

### 2. Discover

First, the owner's answers. For each file in `docs/board/inputs/` whose Status is `answered`:

- do what its "Where the answer goes" says — a line under Decisions in the sprint's spec, a
  fact in the story's file, a proposed ADR;
- move every story it held from Blocked back to Ready, with a line in the story's History,
  "unblocked by I-007: <the answer in a few words>". An answer that takes a story out of its
  sprint drops the story instead, with the owner's reason under Decisions;
- take its line out of "Blocked on the owner" in `docs/PROGRESS.md`, and `git mv` the file to
  `docs/board/inputs/done/`.

An input that held every landing — a deploy that failed twice (move 10) — is applied by running
`{{DEPLOY_COMMAND}}` again, on `main`, with a clean working tree. If it passes, the hold is
over, and the file moves to `done/` like any other. If it fails again, the input goes back to
`open` with what the deploy printed this time, and everything stays held.

`git add docs && git commit -m "docs: inputs applied — I-007, I-009"`. A sprint that was
`waiting` and has no story left in Blocked can move again (move 3).

Then merge what planning sessions have finished: each `plan/` branch, here or on `origin`
(`git branch -a --list "*plan/*"`), with commits that `main` lacks.

```sh
git diff --stat main...<branch>    # only what docs/PLANNING.md says a plan branch may hold
git switch main
git merge --no-ff -m "docs: plan — <title>" <branch>
```

A branch that touches anything else is not merged: tell the owner. When all are in,
`git push origin main` — `main` holds nothing of the sprint in flight, so this sends planning
documents only — then delete each merged branch, `git branch -d <branch>` and
`git push origin --delete <branch>`, and remove its worktree. With a sprint in flight, go back
to it and take the plans in: `git switch sprint/S-NNN && git merge --no-edit main`.

Then anything under `docs/board/sprints/` or in `docs/board/inbox/` that `BOARD.md` does not
list yet:

- a new sprint folder goes into **Sprints**, as `planned`, below the sprints already there. If
  its number is taken, give it the next free one — the folder, its files and every id in
  them — and say so in the report;
- a new story goes into **Ready** if it meets the definition of ready
  (`docs/AGENT_WORKFLOW.md`), otherwise into **Backlog** with what it lacks. If what it lacks
  is an answer — an open question in its sprint's spec — write an input for that question;
- a story in `docs/board/inbox/` gets the next free number in the sprint it names, moves to that
  sprint's folder as `S-NNN.N-<slug>.md` with `git mv`, and then goes into Ready or Backlog
  like any other — to the top of Ready if it says `**Regression** yes`;
- a sprint with no stories gets a breakdown story, `S-NNN.0`, for the `architect`. Its only
  owned path is the sprint's own folder;
- a sprint whose folder a retro has moved into `docs/board/sprints/done/` becomes `done`, and
  its row leaves the table.

A bug that breaks something that already worked goes to the top of Ready.

### 3. Start a sprint

When none is in progress. Take, in this order:

1. a sprint that is `waiting` and can move again: none of its stories is in Blocked any more —
   the owner unblocked it, or built it by hand — or the owner has said how its open finding is
   to be settled;
2. the first sprint in the **Sprints** table that is `planned` and has a story in Ready or a
   breakdown to do;
3. if there is neither, and `S-000` has stories in Ready: a maintenance run — `S-000` itself,
   built, reviewed and landed like any other.

If nothing can be taken, nothing can move: move 11.

```sh
git switch -c sprint/S-012 main    # only if no sprint/ branch exists
```

The branch is the lock, and it is not pushed. If a `sprint/` branch already exists — a sprint
on it is `waiting`, or `reviewed` and held — the new sprint is built on top of it, on that same
branch, which keeps the name of the sprint that opened it. `BOARD.md` gets
`current_sprint: S-012` and the sprint's status `in progress`, in the first wave's planning
commit.

### 4. Plan a wave

Walk Ready from the top and take each story of the sprint in flight that rules 1 and 2 allow.
Then fill the free slots with ready stories of `S-000` — and a regression first of all, before
the sprint's own. Stop at `max_parallel`. A solo story at the top of Ready is a wave on its
own.

```sh
# BOARD.md: the "In wave" table, current_wave: NN, next_wave: NN+1
git commit -am "docs: plan wave NN"
```

The planning commit is the announcement: the inspector shows the wave from it, story by story,
and that is the owner's window to interrupt.

### 5. Build

Spawn every implementer **in one message**, one Agent call per story:

- `subagent_type: "implementer"`, `isolation: "worktree"` — on the call, always, see
  "Agent teams" below;
- in the foreground — no `run_in_background` — with the story id in the call's description,
  and the story's model;
- the implementer brief below, filled in.

The calls of one message run side by side, and their reports come back together. Each
implementer creates `story/<id>-<slug>` from the sprint branch in its own worktree, works test
first, runs `{{VERIFY_FAST}}`, commits, and reports. Wait for every one of them.

### 6. Check each story

When the reports are back, for each one:

- it says `{{VERIFY_FAST}}` passed and every acceptance criterion is met;
- `git diff --stat sprint/S-NNN...story/<id>-<slug>` stays inside the story's owned paths;
- `git diff sprint/S-NNN...story/<id>-<slug>` contains nothing that resembles a key, token,
  password or `.env` value.

No verifier here: it reads the wave once, in move 7.

Pass → move 7. Fail → "When a story fails": the wave's retries go out together, in one message,
before anything is integrated. Blocked → back to Ready or Backlog with the new **Depends on**,
its worktree removed. Refused a command it cannot do without → Blocked, with an input of kind
`setup` ("When a story fails"). And what a report names under **Found** becomes a story ("What
an agent found").

### 7. Integrate, then verify the wave — once

**One commit per story.** In the main checkout, on the sprint branch, each story as it passes
move 6:

```sh
git merge --squash story/<id>-<slug>
git commit -m "<kind>: <what the story delivers> (<id>)"
```

The story's **Kind** is the commit's type, and its id closes the subject —
`feat: the dialog copies the link (S-012.2)` — which is how the board, the inspector and a
later reader find a story's commit. Move 6 has shown that the story stayed inside its owned
paths, and a wave's owned paths do not overlap, so it cannot conflict. If git reports a
conflict all the same, a rule was broken: `git reset --merge`, and the story has failed.

**The full verify.** When every story in the wave is committed, returned or blocked, and at
least one is committed:

```sh
{{VERIFY_COMMAND}}
```

- **Green**: on to the verifier.
- **Red**: the files that fail belong to a story through its owned paths, and that story has
  failed after its commit — "When a story fails". If they point at no single story — two
  stories green alone, red together — back out the wave's newest story commit with
  `git revert --no-edit <commit>`, return that story to Ready with the output, and run again.

**The verifier.** One for the whole wave, in the foreground: `subagent_type: "verifier"`,
`isolation: "worktree"`, the verifier brief with the file and the commit of every committed
`opus` story. A wave whose committed stories are all `sonnet` gets none. Its verdict is per
story:

- **pass**, or **pass with debt** — the debt goes into `docs/PROGRESS.md`, or becomes a story;
- **fail** — that story has failed after its commit.

Only this move runs `{{VERIFY_COMMAND}}`, and a wave with nothing to fix runs it exactly once.

### 8. Record the wave

When every story in the wave is committed, returned or blocked:

1. Number the proposed ADRs: `docs/adr/proposed/<id>-<slug>.md` becomes
   `docs/adr/ADR-NNNN-<slug>.md` with the next free numbers, in the order of the commits.
2. `BOARD.md`: every story to Done, Blocked or back to Ready; the sprint's "Stories done";
   `current_wave: none`.
3. Write `docs/board/log/wave-NNNN.md`, in the shape `docs/board/log/README.md` gives. Its
   **Contexts** lines measure every agent of the wave (ADR-0008): the planning commit's time,
   then the report from that time, pasted as it prints —

   ```sh
   git log -1 --format=%cI --grep="^docs: plan wave NN$"
   node tools/context-report.mjs --since <that time>
   ```
4. Each story of `S-000` that is now done: `git mv` it into
   `docs/board/sprints/done/S-000-maintenance/`, so the standing sprint's folder holds what is
   still open.
5. Rewrite `docs/PROGRESS.md` wherever reality changed.
6. `git add docs && git commit -m "docs: record wave NN"`, and go through the wave checklist in
   `docs/AGENT_WORKFLOW.md`.

Then:

- stories of the sprint are left that can run → move 2, then move 4 — unless this was the last
  wave your brief allows: then hand back `in progress` (move 11), and a fresh lead goes on;
- every story of the sprint is done → move 9;
- stories are left and none can run — each is blocked, or waits for one that is → the sprint is
  stuck. Set it to `waiting` in the Sprints table, with `current_sprint: none`; see that every
  blocked story has its input (see "Inputs"); commit that with the wave's record; and hand
  back `waiting` (move 11). The run does not stop: the next lead takes the next sprint;
- a maintenance run is one wave: move 9.

### 9. Review the sprint — once

Take in what was planned meanwhile: `git merge --no-edit main`. If that brought anything but
documents, run `{{VERIFY_COMMAND}}` again first.

Then spawn two reviewers **in one message**, in the foreground: `subagent_type: "reviewer"`,
`isolation: "worktree"`, one with the Spec brief and one with the Standards brief. They do not
see each other's work, so neither colours the other. A maintenance run has no spec: it gets the
Standards reviewer alone.

What they read is **the sprint's own commits**: the ones whose subject closes with one of its
story ids, `git log --oneline main..HEAD --grep "(S-012\."` — and, for the Standards reviewer,
the maintenance stories built in its waves as well, `--grep "(S-000\."`. On a branch that
carries one sprint that is everything since `main`; on one that carries several it is not, and
a reviewer that read `main...HEAD` would read another sprint's work.

Each finding comes back in one of two classes:

- **must fix** — the spec is not met, or the product now does something nobody asked for; or a
  prime directive, or a rule written in `docs/CODING_STANDARDS.md`, is broken;
- **for the owner** — a judgement: a smell, a doubtful name, something that could be simpler.

Write `docs/board/sprints/<sprint folder>/review.md`: one line per axis with its counts, then
the two reports as they came, under `## Spec` and `## Standards`. Do not merge or rerank them:
a sprint can pass one and fail the other, and a single list would hide that. Close it with the
reviewers' **Contexts** lines: the context report since the time of the last wave's record
commit. A maintenance run has no folder of its own to keep a review in: write it as
`docs/board/log/wave-NNNN-review.md`. `git add docs && git commit -m "docs: review S-012"`.

- **No must-fix**: move 10.
- **Must-fix findings**: each becomes a story of the sprint — **Kind** `fix`, the next free
  number, owned paths from the finding, and as its acceptance criterion that the finding no
  longer holds — built as one more wave, moves 4 to 8. Then the reviewer that raised them reads
  again: its brief, those findings, and the line "Check these findings and nothing else." A
  finding that survives its second fix makes the sprint `waiting`, as a blocked story does:
  write an input of kind `decision` — the finding, what each fix tried, and the ways to settle
  it — and hand back `waiting` (move 11).
- **Findings for the owner** do not hold the sprint. They stay in `review.md`, the final report
  counts them, and `/retro` reads them.

### 10. Land

When the sprint's `review.md` has no must-fix left open — and nothing holds the landing:

- **a sprint on the branch is `waiting`.** This sprint is finished and stays where it is: it
  sits on top of the waiting one's commits, so it can only land together with it;
- **a deploy that failed holds every landing**: an input whose **Blocks** line says
  `every landing` is still open (step 3 below). What is pushed next would go online on top of
  a deploy nobody has looked at.

Held, the sprint is set to `reviewed` in the Sprints table, with `current_sprint: none`, and
the lead hands back `reviewed` (move 11). The next sprint is built on top of it.

If `BOARD.md` says `land: ask`, set the sprint to `reviewed`, write an input of kind
`approval` — what would be pushed, and the review's counts — and hand back `ready to land`.
The run ends there, and the branch lands on the owner's yes, given as that input's answer. It
is the one switch that makes autopilot wait.

1. `BOARD.md`: every sprint on the branch to `landed`, `current_sprint: none`, and the **Now**
   line rewritten; `docs/PROGRESS.md`. `git commit -am "docs: S-012 reviewed and finished"`, and
   go through the sprint checklist in `docs/AGENT_WORKFLOW.md`.
2. Land it — one merge commit, with the stories behind it:

   ```sh
   git switch main && git pull --ff-only
   git merge --no-ff sprint/S-012 -m "feat: <what the sprint delivers> (S-012)" -m "<its stories, a line each, and the review in one line>"
   git push origin main
   ```

   Every story commit went through TruffleHog when it was made, and the push scans them all
   again (`.githooks/`). Never `--no-verify`, never a force push. A technical sprint lands as
   `refactor:`, and a maintenance run as `fix: <what it puts right> (S-000, wave NN)`. A branch
   that carried more than one sprint lands as one merge that names them all:
   `feat: share links and due dates (S-012, S-013)`.
3. **Deploy**, if the project deploys: `{{DEPLOY_COMMAND}}`, here, on the `main` you just
   pushed, with a clean working tree. If it fails, run it once more. A deploy that fails twice
   is not a failed sprint, and it does not end the run — but it holds every further landing.
   Write an input of kind `setup` whose **Blocks** line says `every landing`, with what the
   deploy printed and what the owner is to check, and commit it on `main` as
   `docs: input I-NNN — the deploy failed`. Nothing rolls back by itself, and `main` stays as
   it is: the sprint is `landed`, and not yet online. Building goes on; what is finished
   meanwhile stays `reviewed` on its branch until the owner has answered and the deploy has
   passed (move 2).
4. Clean up: `git branch -d sprint/S-012` — that lifts the lock — then `git worktree remove`
   each of the sprint's worktrees and `git branch -D` each of its `story/` branches.

**TruffleHog stops a commit or a push** — the hook says what it found. That is not a failed
story: write the `stop` input and hand back `stopped`. A push it stopped sent nothing, but the
secret is in the local history, and the owner decides whether it is rotated; one that had
already left the machine is rotated first and removed from the history second
(`docs/SECRETS.md`). Both need the owner.

### 11. Hand back

A sprint lead carries one sprint and then reports to the orchestrator, which starts the next
lead in a fresh context. Hand back as:

| Status | When |
| --- | --- |
| `landed` | the sprint is on `main`, pushed and deployed — or pushed, with a deploy that failed twice and now holds the landings (move 10) |
| `reviewed` | it is finished and read, and held on its branch: it sits on a sprint that is `waiting`, or behind a deploy that failed |
| `ready to land` | it is finished and read, and the board says `land: ask`: its `approval` input is written |
| `waiting` | it cannot finish without the owner (move 8, move 9) |
| `in progress` | three waves are recorded, or the number the brief allows, and stories are left. A fresh lead goes on |
| `nothing can move` | move 3 found nothing to take: no story anywhere is ready, and every sprint that has not landed is `waiting` or held |
| `stopped` | going on could do harm ("What stops a run, and what does not"): the `stop` input says what the owner has to do |

The report is all the orchestrator keeps, for a run that may last for days. This shape, and
nothing else:

```text
<status>
Sprint: S-012 Share links — stories 5/5 — waves 12 to 14 — review: 1 fixed, 2 for the owner
Landed: 1a2b3c4 on main, deployed         (or what holds it, or what it waits for)
Inputs: I-007 a mail provider, holds S-012.4 — I-008 the deploy failed, holds every landing
Next: S-013 Due dates, planned, 3 stories ready         (or: nothing can move)
```

A lead that built maintenance stories only names `S-000` and its wave. A hand-back in the
middle of a sprint leaves it in flight on its branch; the next lead, or the next run, carries
on with it from move 1.

---

## By hand

`/implement` builds one story with the owner in the room. It is the careful way: nothing it
does reaches git unless the owner puts it there.

1. The owner types `/implement` — with a story, with a sprint, or with nothing.
2. The session looks, and changes nothing: the board, `git status`, the branch that is checked
   out, the plan branches that wait. If an orchestrator is at work — `current_wave` is a
   number, or a worktree under `.claude/worktrees/` is locked — it stops: two builders in one
   sprint collide. If the working tree holds changes that are not committed, it says so and
   asks.
3. It applies the owner's answered inputs and lists on the board what is new under
   `docs/board/`, as move 2 does, and names the plan branches that wait; it merges those only
   on the owner's yes, and pushes nothing.
4. It asks what to build, unless the owner named a story: the stories of the sprint in
   progress, or of the first planned one, each with its state; the ready ones as choices, and
   room to type any other story or sprint.
5. It builds that one story itself, in the checkout and on the branch as they are: test first,
   inside the story's owned paths, `{{VERIFY_FAST}}` and then `{{VERIFY_COMMAND}}` green. No
   sub-agent, no worktree, no branch of its own.
6. It decides nothing the story did not decide. Before a new dependency, a change to a
   contract, a file outside the owned paths, a change to a check or an existing test, or a
   choice between two designs, it stops and asks, with options. It builds nothing that was not
   asked for: what it notices on the way it names in its report, and leaves alone. What the
   owner cannot give there and then — an account that takes days, a decision to sleep on —
   becomes an input, and the story goes to Blocked.
7. It records the story — the board, a log file for a wave of one, `docs/PROGRESS.md` — as
   changes in the working tree like any other.
8. It reports and stops: what changed, both verify outputs, each acceptance criterion, what it
   noticed, and a commit message that follows the convention,
   `feat: the dialog copies the link (S-012.2)`. The owner reads the diff, commits, and pushes
   when they see fit.

Given a sprint, it takes that sprint's stories in order and still stops after each one; it
takes the next when the owner says so, after seeing that the last one is committed.

When a sprint's last story is done by hand, the sprint is `built`: reviewing it
(`/sprint-review`), merging it and pushing it are the owner's, and `/retro` closes it. A sprint
lead leaves a `built` sprint alone. The exception is a story built by hand on a `sprint/`
branch of autopilot's: that sprint stays `in progress`, and the next `/autopilot` reviews and
lands it like any other.

---

## A fix that cannot wait

A fix rides in the next wave and lands with its branch — which, while a sprint on it is
waiting, is not soon. When the owner says it cannot wait, a story that is already committed on
the sprint branch goes out ahead of it:

```sh
git switch main && git pull --ff-only
git cherry-pick <the story's commit>
{{VERIFY_COMMAND}}
git push origin main            # then the deploy, as in move 10
git switch sprint/S-NNN && git merge --no-edit main
```

On the owner's word only, and say in the wave's log entry that it went out early. When the
sprint lands, git finds the same change on both sides and merges it without a conflict.

---

## What an agent found

Agents do not message each other. Each works alone on its story and reports once, to the sprint
lead that started it. What the board should know goes into that report, under **Found**: a bug
outside the story's owned paths, a wrong assumption in the story, a dependency nobody planned.

The lead turns everything actionable into a story — a bug becomes a story of the sprint it
belongs to, or of `S-000` — and lists it on the wave's **Found** line. The report is the
doorbell; the board is the record.

---

## Agent teams

Claude Code's experimental agent teams resemble this protocol, but teammates share one checkout,
and while teams are enabled a named sub-agent launches as a teammate — unless the Agent call
passes `isolation` itself. So `.claude/settings.json` sets `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS`
to `"0"`, and every Agent call a sprint lead makes passes `isolation: "worktree"` explicitly,
even though the agent definitions set it too. The lead itself is the one agent without a
worktree: it works in the main checkout, where the board is.

The agents live in `.claude/agents/`. Claude Code picks up edits to them live, but a session
only watches agent directories that existed when it started — if the directory is new, start
`/autopilot` from a new session. A sub-agent may start agents of its own, three layers deep at
most; this protocol uses two — the lead, and the lead's agents.

---

## Model and effort policy

Quality over cost (ADR-0004):

- **`opus`** — every story by default: design, implementation, tests, verification, review,
  retries.
- **`sonnet`** — only super simple, mechanical work with no judgement in it: renames, file
  moves, formatting, dependency bumps. When in doubt, it is an `opus` story.
- **Haiku is not used.**
- **Effort `high`, and `max` for whoever checks** (ADR-0008). For sessions
  `.claude/settings.json` sets `CLAUDE_CODE_EFFORT_LEVEL` to `high` and the starting model to
  `opus`; the `sprint-lead`, the `implementer` and the `architect` set `effort: high` in their
  definitions. The `verifier` and the `reviewer` stay at `max`: one runs once per wave and two
  once per sprint, so they cost little, and they are the check on the lowered effort everywhere
  else. The Agent tool can override a sub-agent's model per call, but not its effort, which is
  why `sonnet` stories reuse the `implementer` definition with a model override.

Use the aliases `opus` and `sonnet`, never a pinned model id. The story's **Model** field is the
choice; raise a `sonnet` story to `opus` the moment it turns out to need judgement.

---

## Briefs

Filled in, and nothing else — a sub-agent gets no history and needs none. The orchestrator
sends the first; a sprint lead sends the others.

### Sprint lead

```text
You are the sprint lead for {{PROJECT_NAME}}. Carry the board forward by one sprint, in this
checkout, following "A sprint, move by move" in docs/ORCHESTRATION.md from move 1. You have no
context from any earlier work and need none: the board, the log and git say where things
stand, and what is to be built next.

Hand back after <n> waves at the latest, and sooner as move 11 says.
From the owner: <their words since the run began, or "nothing">

Report in the shape move 11 gives, and nothing else.
```

`<n>` is three, or fewer where the owner's stop point leaves fewer waves.

### Implementer

```text
Execute exactly one story of {{PROJECT_NAME}}: <id> — <title>. You are one of <n> agents in
wave <NN> of sprint <S-NNN>, each in its own git worktree. You have no context from any
previous work.

Start in your worktree:
  git switch -c story/<id>-<slug> sprint/<S-NNN>
  {{INSTALL_COMMAND}}

Read, in this order, and stop when you know enough:
  1. CLAUDE.md
  2. docs/PRIME_DIRECTIVES.md
  3. docs/GLOSSARY.md                                  <- the words to use in every name you write
  4. docs/board/sprints/<sprint folder>/sprint.md      <- what the sprint is for
  5. docs/board/sprints/<sprint folder>/<id>-<slug>.md <- your story
  6. only what the story's "Read" list names
Do not scan the repository. Read narrowly: find code with grep first (grep -n, or the Grep
tool), then read only the range you need. Never print a whole file of more than about 300
lines — not with cat, not with sed -n over all of it, not with Read and no range.

Owned paths — you may create and edit only: <globs>
Forbidden — everything else, and always docs/board/BOARD.md, docs/board/log/, docs/PROGRESS.md,
CLAUDE.md and docs/adr/ADR-*.md.

Do the story test first: for each rule, calculation or decision directive 14 covers, one test,
watch it fail, then the least code that passes it, then the next. No other tests. For a bug,
run the story's Reproduce command first and see it fail. Run {{VERIFY_FAST}} until it is
green — never {{VERIFY_COMMAND}}, which the sprint lead runs once for the whole wave.
Update the CLAUDE.md of a directory in your owned paths whose public surface changed; if
another directory's needs it, say so in your report. A decision the story did not fix goes in
docs/adr/proposed/<id>-<slug>.md, in the ADR format. Commit on your branch, as often as you
like — the sprint lead makes one commit of it — and never with --no-verify. Do not push or
merge.

A command that is refused: this project's settings do not allow it, and nobody is there to ask.
Never look for a way around a refusal. Do the step another way if there is an honest one — a
file is written with Write, moved with git mv, removed with git rm and never with rm — and if
the story cannot be done without the command, stop and report "refused: <the command> — needed
for <what>".

Stop and report instead of improvising if: {{VERIFY_FAST}} still fails after two honest
attempts at the real cause; you need another story's work that is not on the sprint branch
(report "blocked by <id>: <why>"); the story needs something only the owner can do; the story
is wrong; or doing it would break a prime directive. Never weaken a gate to get to green.

Report in six lines: your branch and commits; the verify output; anything you could not do;
decisions and their proposed ADRs; each acceptance criterion, met or not; and Found — what the
board should know: a bug outside your owned paths, a wrong assumption in the story, a
dependency nobody planned. "Found: nothing" if there is nothing.
```

### Verifier

```text
Verify wave <NN> of {{PROJECT_NAME}} in your own worktree. Change nothing.
  git switch --detach sprint/<S-NNN>

The sprint lead has just run {{VERIFY_COMMAND}} on this commit, and it was green. Do not run
it again, nor {{VERIFY_FAST}}. Run a single test or command only where one criterion's evidence
needs it, after {{INSTALL_COMMAND}}.

The stories to verify — for each, its acceptance criteria are your checklist, and its one
commit is its change:
  <id>   docs/board/sprints/<sprint folder>/<id>-<slug>.md   git show <commit>
  <id>   …
The wave as a whole is `git diff <the wave's planning commit>..HEAD`. The board files in it are
the sprint lead's.

Start from git show --stat and the diffs. Read the code around a change only where the diff
needs it: find it with grep, then read only that range. Never print a whole file of more than
about 300 lines — not with cat, not with sed -n over all of it, not with Read and no range.

Report a verdict for each story — pass, pass with debt, or fail — with the evidence for each
acceptance criterion, and for fail the smallest change that would make it pass. Then, once,
whatever only the whole wave shows.
```

A re-check after a fix is the same brief with the one story, the findings it failed, and the
line "Check these findings and nothing else."

### Reviewer — Spec

```text
Review sprint <S-NNN> of {{PROJECT_NAME}} against its spec, in your own worktree. Change nothing.
  git switch --detach sprint/<S-NNN>

The spec is docs/board/sprints/<sprint folder>/sprint.md; the stories beside it show how it
was cut. The sprint's change is its own commits, one per story and one per fix:
  git log --reverse --oneline main..HEAD --grep "(<S-NNN>\."
Read each with git show. Other commits on the branch belong to other sprints, to maintenance
stories or to the sprint lead: they are not yours to judge. A story the board says is done
and that has no commit here was built by hand, and is part of the code as it stands.

A verifier has already checked each story against its own acceptance criteria. You read the
sprint as a whole against what the owner asked for. Go through sprint.md line by line — every
behaviour row, every state, every rule, every acceptance criterion — and report:
  (a) what it asks for that is missing, or only partly there;
  (b) what the sprint does that nobody asked for;
  (c) what looks built, but is built wrong.
Quote the line of sprint.md for each finding, and name the file and lines of the code.

Class each finding: "must fix" when the spec is not met or the product now does something
nobody asked for; "for the owner" when it is a doubt, or a line of the spec that reads two
ways. Start from the diff; read around it only where it needs it, found with grep first. Under
500 words. If the sprint does what its spec says, say so plainly and stop.
```

### Reviewer — Standards

```text
Review sprint <S-NNN> of {{PROJECT_NAME}} against the project's standards, in your own
worktree. Change nothing.
  git switch --detach sprint/<S-NNN>

Read docs/CODING_STANDARDS.md, the Architecture and Code sections of docs/PRIME_DIRECTIVES.md,
and docs/GLOSSARY.md. Then the sprint's change — its own commits and those of the maintenance
stories built in its waves, one per story and one per fix:
  git log --reverse --oneline main..HEAD --grep "(<S-NNN>\." --grep "(S-000\."
Read each with git show. Other commits on the branch belong to other sprints or to the
sprint lead: they are not yours to judge.

Report, by file and lines:
  (a) every place the change breaks a prime directive or a rule written in
      docs/CODING_STANDARDS.md — cite the rule;
  (b) every smell of that file's baseline you see — name it and quote the lines;
  (c) every name that goes against the glossary.
Leave out what a tool already enforces: the linter, the type checker, the architecture check.

Class each finding: "must fix" for (a); "for the owner" for (b) and (c) — a smell is a
judgement, never a breach, and a written standard always outranks the baseline. Start from the
diff; read around it only where it needs it, found with grep first. Under 500 words. If the
sprint is clean, say so plainly and stop.
```

For a maintenance run, and for a `/sprint-review` of anything that is not a sprint in flight,
the briefs are the same with the commits or the diff the command names in place of those.

### Architect — breakdown

```text
Break sprint S-<NNN> of {{PROJECT_NAME}} into stories, in your own worktree.
  git switch -c story/S-<NNN>.0-breakdown sprint/S-<NNN>
Read CLAUDE.md, docs/PRIME_DIRECTIVES.md, docs/GLOSSARY.md, docs/ARCHITECTURE.md, the
"Stories", "Slicing a sprint into stories", "Definition of ready" and "Owned paths and parallel
work" sections of docs/AGENT_WORKFLOW.md, the sprint's sprint.md, and only the code at the
boundaries it touches — found with grep first, then read only the range you need; never print a
whole file of more than about 300 lines. Write one file per story into
docs/board/sprints/<sprint folder>/ from docs/board/_TEMPLATE-story.md, numbered <NNN>.1,
<NNN>.2, …, each story's Read list naming the functions or sections to read, not just the
files. Cut slices, not layers, and design for side-by-side work: disjoint owned paths, explicit
Depends on, and any contract change first, as its own Solo story. Your only owned path is the
sprint's folder. Commit; do not push. Report the stories, their dependency order, and which of
them could share a wave.
```

---

## When a story fails

**Before its commit** — the fast verify, a check in move 6, or a conflict in move 7:

1. **First failure**: a **fresh** implementer on `opus`, cut from the sprint branch, with the
   failure output and what has already been ruled out. The wave's retries go out together, in
   one message, before the wave is integrated. Fresh context, not a continuation: a stuck
   agent usually stays stuck.
2. **Second failure**: the story goes to Blocked with what was tried and the suspected cause,
   and an input of kind `look` that says both.

**After its commit** — the full verify is red on its files, or the verifier's verdict is `fail`:

1. **First failure**: a fresh implementer on `opus`, cut from the sprint branch, on
   `story/<id>-fix`, with the story's own owned paths and the output or the verifier's
   findings. Its fix is committed like any story, as `fix: <what was wrong> (<id>)`. Then
   `{{VERIFY_COMMAND}}` again — and after a verifier's `fail`, a re-check of those findings
   only.
2. **Second failure**: `git revert --no-edit` the fix's commit and then the story's, run
   `{{VERIFY_COMMAND}}` once more, and the story goes to Blocked with what was tried, and an
   input of kind `look`.

**Refused a command it cannot do without** — its report says `refused: <the command>`. That
is no failure of the agent, and a second one would be refused the same: no retry. The story
goes to Blocked, with an input of kind `setup` that names the command, what in the story needs
it, and the rule that would allow it in `.claude/settings.json`. Allowing it is the owner's:
no session loosens its own permissions.

A wave never waits for a blocked story, and a blocked story blocks only the stories that depend
on it. A blocked story of `S-000` simply stays on the board. A blocked story of the sprint in
progress means that sprint cannot finish: build what does not depend on it, then set the
sprint to `waiting` and hand back (move 8). The owner answers its input with `/resolve`, builds
the story by hand with `/implement`, or takes it out of the sprint; the next sprint lead then
carries on with that sprint first (move 3).

## What stops a run, and what does not

On autopilot nobody stops to ask. What needs the owner is set aside as an input — a file in
`docs/board/inputs/` that says what is needed — and everything that does not depend on it goes
on:

- a story that needs the owner — a cloud resource, a secret, a paid plan, an account, a
  repository setting, a decision — goes to Blocked, with its input;
- a story that failed twice goes to Blocked, with an input of kind `look`;
- a command the settings do not allow is refused at once, not asked for: the sprint lead and
  its agents run in a permission mode that never prompts (`.claude/README.md`). An agent does
  the step another way; a story that cannot do without the command goes to Blocked, with an
  input of kind `setup` that names it;
- a sprint that cannot finish, or whose must-fix has survived its second fix, is set to
  `waiting`, and the next sprint is built on top of it;
- a deploy that failed twice holds every further landing, and building goes on (move 10).

**A lead stops at once, and hands back `stopped`, only where going on could do harm:**

- TruffleHog stops a commit or a push;
- anything would become public, or a repository would change visibility;
- a secret would have to be written anywhere other than the vault in `docs/SECRETS.md`;
- **the board** is wrong — not a story. Propose the new shape; never silently re-plan;
- a prime directive would have to be broken to continue;
- the working tree holds changes that are not committed: a story built by hand is waiting for
  the owner's review. This one without an input — the working tree is the owner's just then.

Before it hands back, it writes an input of kind `stop`: what happened, what it printed, and
what the owner has to do before building can go on. The owner may not be reading the session;
the file is there when they come back. **A stop is a stop**: while that input is open, no run
starts and no lead builds — the orchestrator looks before its first lead, and every lead in
move 1. Answered, it is applied like any other input (move 2), and building goes on.

And a run ends, with the orchestrator's report, when nothing can move, when the stop point is
reached, when two leads in a row have changed nothing — or, with `land: ask`, when a branch is
ready to land.

## Inputs

Whatever waits on the owner is a file in `docs/board/inputs/`, one each, so that the owner can
go through them one by one (`docs/board/inputs/README.md`). The moment the builder needs
something only the owner can give, it:

1. writes `docs/board/inputs/I-NNN-<slug>.md` from `docs/board/_TEMPLATE-input.md`, with the
   next free number — for someone who comes back in three days and remembers nothing: what is
   needed, why an agent cannot settle it, what it holds up, the options with the one it would
   take, or the exact steps, and where the answer goes. Never a secret, and never a request to
   type one: a `secret` input says where the value goes;
2. puts the input's id in the "Needs" column of the story's row in Blocked, and one line under
   "Blocked on the owner" in `docs/PROGRESS.md`: the id, what is needed in a few words, what it
   holds up;
3. goes on with everything that does not depend on it.

Two inputs hold more than a story. One of kind `stop` holds every run until it is answered.
One whose **Blocks** line says `every landing` — a deploy that failed twice — holds what is
finished on its branch, while building goes on. And a command the settings refused, which a
story cannot do without, is an input of kind `setup`: it names the command and the rule that
would allow it, and the owner decides.

The owner answers with `/resolve`, which takes them through the open inputs one at a time and
writes each answer into its file — or by editing the file. `/resolve` changes nothing else.
The builder applies the answers in move 2, at its next start and at every wave planning, so an
input answered while a wave is being built is picked up by the next one.

---

## Watching a sprint

The owner's view is the inspector — `/board`, or `node tools/inspector/serve.mjs` in a terminal (ADR-0006). It
takes from the board which stories are in the wave, and from git where each one stands: a
locked worktree is an agent at work, a commit on the sprint branch that names a story's id
means the story is in, and a locked detached worktree at the sprint branch's tip is the
verifier or a reviewer. So there is nothing to do for it: do not rewrite the board's State
column for its sake, and never read it or take a screenshot of it — it shows nothing the
repository does not say.

## Setting up the repository

Done once, in Phase 0. The repository is private (directive 18), and GitHub stores it — nothing
more is set up there (ADR-0009): no workflow, no branch protection, no merge settings.

```sh
gh repo create {{GITHUB_OWNER}}/{{PROJECT_NAME}} --private --source . --push
git config core.hooksPath .githooks                       # TruffleHog on every commit and push
sh .githooks/pre-push --all                               # the whole history, once
```

`core.hooksPath` lives in the clone's own `.git/config`, so every clone sets it once — the
README's quickstart says so — and every worktree of the clone inherits it. The two hooks are
committed as executable (`git add --chmod=+x .githooks/pre-commit .githooks/pre-push`, in
Phase 0): on macOS and Linux git skips a hook that is not. The hooks fail
closed: on a machine without `trufflehog` nothing is committed or pushed (`docs/SECRETS.md`
says how to install it).

## Branches that are not sprints

- **Plan branches** from planning sessions — `plan/<slug>`: documents only, pushed as a backup.
  Move 2 merges them into `main` at the next wave planning, sprint or no sprint in flight.
- **Prototype branches** — `prototype/<slug>`: throwaway code that answered a design question,
  kept as the record of the answer. Never merged, never built on.
- **Dependency updates** come from no bot. Each is a story of `S-000`, `sonnet`, Solo — it
  touches the lockfile — so it runs in a wave of its own and gets the full verify.

## Using more of GitHub

Only if the kickoff decided it, in an ADR (ADR-0009). Each changes these moves and nothing else:

- **A pull request per sprint.** Move 10 pushes the sprint branch instead of merging it:
  `git push -u origin sprint/S-012`, then
  `gh pr create --title "S-012 — <what it delivers>" --body "<the head of review.md>"`,
  `gh pr merge --merge --delete-branch`, and `git switch main && git pull --ff-only`. A merge
  commit, never a squash: each story stays one commit. The repository allows merge commits. In
  `.claude/settings.json`, lift the deny on `gh pr create` and allow those `gh pr` commands.
- **A deploy from GitHub Actions.** A workflow that deploys `main` on every push, building what
  it deploys; the deploy in move 10 is dropped, and `{{DEPLOY_COMMAND}}` moves from `allow` to
  `deny`. Lift the deny on writing `.github/workflows/`. The deploy's secrets live in GitHub
  repository secrets, by name, and in `docs/SECRETS.md`. Move 2 pushes planning documents to
  `main` between landings, so let the workflow skip a push that changes nothing but `docs/`.
- **A required check.** Only with a workflow to require, and branch protection on a private
  repository needs a paid GitHub plan. The tests stay local either way (ADR-0007).

## Final report

The orchestrator's, from what its leads reported; it reads `docs/PROGRESS.md` once more for the
open inputs, and nothing else. One row per sprint — its id, stories ✓/✗, the waves it took, the
review as "n fixed, n for the owner", and the commit it landed as with the deploy, or that it
is waiting or held and on what. Then, in one list, every open input — its id, what is needed,
and the story or sprint it holds up; the next sprint on the board; and each landed sprint that
waits for its `/retro`. Under a screen. Its last lines tell the owner to type `/resolve` to go
through the inputs, and `/clear` before the next `/autopilot`.
