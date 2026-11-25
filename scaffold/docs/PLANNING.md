# Planning

How work gets onto the board. `docs/AGENT_WORKFLOW.md` says what a sprint and a story are, and
`docs/ORCHESTRATION.md` how they are built. This file is for a planning session: one the owner
started with a command from the table below.

**Planning never waits for building.** A planning session can run while a sprint is being
built. It writes on a branch of its own, in a worktree of its own, and only files no sprint
touches. The sprint lead merges that branch at its next wave planning — which is how a running
`/autopilot` picks up a new sprint or a bug without being told. When the owner builds by hand
instead, `/implement` names the branches that wait and merges them on a yes.

| Command | Ends in |
| --- | --- |
| `/ideate` | A shared understanding: terms in the glossary, decisions proposed, nothing planned yet. In a project that has not been kicked off, the brief `KICKOFF.md` |
| `/feature` | A sprint folder: `sprint.md` and its stories. After a short interview — or with none, typed in the session that just ideated |
| `/fix` | One story in the inbox, with the command that reproduces the bug |
| `/refactor` | A technical sprint, or one story in the inbox |
| `/sprint-review` | Two reviewers' reports, side by side; the findings the owner picks become stories |
| `/project-review` | A survey of the whole codebase in `docs/reviews/`; what the owner picks becomes sprints or stories |
| `/retro` | A landed sprint's lessons moved to where they will be read, and its folder in `sprints/done/` |

## The interview

Treat the idea as a tree of decisions: each one opens the decisions that hang off it.

- **Work in rounds.** A round asks every question that can be asked now — every decision whose
  prerequisites are settled — numbered, each with the answer you would recommend and, where it
  helps, two or three options. A question whose answer depends on one that is still open belongs
  to a later round. Then wait for the answers; they reshape the tree.
- **Hardest first.** Within a round, lead with the question most likely to change the shape of
  everything else.
- **Facts are yours to find; decisions are the owner's.** What the repository, the glossary,
  `docs/FEATURES.md`, an ADR or the documentation of a tool can answer, look up — or send a
  sub-agent — and say what you found. Never ask the owner for something you could have read.
  While a sub-agent is looking, ask the questions that do not depend on it.
- **Push back.** Say where the idea is vague, contradicts itself, or is bigger than it needs to
  be. If a simpler shape gets 90% of the value, say so before the complicated one is designed.
  Check `docs/FEATURES.md` for what exists and `docs/board/LATER.md` for what was decided
  against, and say so when the idea is one of them.
- **Test it on a case.** When the owner says how two things relate, invent the awkward scenario
  that sits on the boundary and ask what happens there. When the owner says how something works
  today, check that the code agrees, and say so when it does not.
- **Done is when nothing is left to assume.** Every branch visited, no decision made silently.
  Then say in a few lines what you understood, and ask the owner to confirm it. Nothing goes on
  the board before that.

A round looks like this:

```text
1. Who may open a shared link? Anyone who has it, or only people signed in?
   I would say: anyone who has it — that is what "share" means to the people you described,
   and a sign-in wall is the feature they said they left the old tool for.

2. Does a link ever stop working?
   I would say: only when its owner revokes it. Expiry dates are in LATER.md, decided against
   in March.
```

If you have a tool that puts questions to the owner as options, use it for the questions that
have clear options, the recommended one first — and write what the round is about above it,
because the owner may see only the dialog.

## The glossary

`docs/GLOSSARY.md` holds the project's own words. Every session and every agent reads it, and
names in code, tests, commits, stories and specs use its terms. A planning session keeps it
sharp while it talks:

- **A word used against the glossary**: say so at once. "The glossary says a *cancellation*
  ends the whole order; you seem to mean one line. Which is it?"
- **A vague or overloaded word**: propose one precise term. "You say *account* — the customer,
  or the person signed in? They are different things here."
- **A term that settles is written down the moment it settles**, not at the end: the rest of
  the conversation then uses it, and an interrupted session has lost nothing.

An entry is the term, one or two sentences on what it **is** — not what it does, and nothing
about how it is built — and the words it replaces:

```md
**Share link** — an address that opens one board for anyone who has it, without signing in.
_Avoid:_ public URL, invite
```

Only words that belong to this project go in. *Timeout*, *adapter* and *queue* are every
project's words. When several words exist for one thing, pick one and list the others under
_Avoid_. Two words that were confused and are now told apart get a line under "Flagged
ambiguities", so nobody confuses them again.

## Decisions

Most decisions of an ideation are one line under **Decisions** in `sprint.md`. A decision
becomes an ADR only when all three hold:

1. **Hard to reverse** — changing your mind later costs real work.
2. **Surprising without its context** — a later reader would ask why on earth it is this way.
3. **A real trade-off** — there was an alternative, and it lost for a reason.

Then write it as `docs/adr/proposed/<slug>.md`, in the shape of `docs/adr/_TEMPLATE.md`; the
sprint lead numbers it. If something contradicts an existing ADR, say so plainly — "this goes
against ADR-0007, and is worth reopening because…" — rather than planning past it.

## Later

`docs/board/LATER.md` has two lists. **Parked**: what is wanted but not now — a line each.
**Decided against**: what was asked for and refused, with a reason that will still be true in a
year. "Too busy" is a parking, not a refusal. Write the line when the owner says no, so the
next ideation does not propose it again.

## Detours

**A prototype**, when a question needs something to look at or to play with — does this state
model feel right, what should this screen look like:

```sh
git fetch origin
git worktree add .claude/worktrees/prototype-<slug> -b prototype/<slug> origin/main
```

Throwaway from the first line, and named so nobody takes it for the product. One command or one
double-click starts it. State in memory; no tests, no error handling, no abstraction. For a
question about logic, one HTML file that shows the whole state after every step; for a question
about a screen, a few clearly different variants to switch between. When the owner has decided,
commit it there and `git push -u origin prototype/<slug>` — it is the record, and it is never
merged. Write the question and the verdict under **Decisions** in `sprint.md`, with the
branch's name, and with the few lines of the prototype that say the decision better than prose
can. Then remove the worktree.

**Research**, when a question needs facts from outside: start a sub-agent in the background
with the question. It reads primary sources — the official documentation, the source code, the
specification — and writes `docs/research/<topic>.md` in your worktree, every claim with the
source it came from. Carry on with the questions that do not wait for it.

## A sprint, or a story

- **One agent in one session** can do it: one story, in `docs/board/inbox/`
  (`docs/board/inbox/README.md`). A bug, a chore, a small change.
- **More than that**: a sprint — one outcome the owner could see working. More than about eight
  stories, or two behaviours that have nothing to do with each other: two sprints, in the order
  they should be built.
- It changes a sprint that is `in progress` or `landed`: stop and tell the owner. Such a sprint
  is changed through the orchestrator. A sprint that is still `planned` may be changed.

`docs/AGENT_WORKFLOW.md` has the shape of both, how to slice a sprint into stories, and the
definition of ready.

A question the owner cannot answer in the session stays under "Open questions" in the sprint's
spec. Do not write an input for it: whoever builds next does, when it lists the sprint on the
board, and `/resolve` then puts it to the owner.

## Where a planning session writes

**Read in the main checkout, write in your own.** `docs/board/BOARD.md` in the main checkout
shows the board as it is right now, even while a sprint is in flight. Your worktree is cut from
`origin/main`, which may be a sprint behind.

1. **Make room.** Run `git rev-parse --git-dir` and `git rev-parse --git-common-dir`:
   - the same path twice means this is the main checkout, where the sprint lead works. Never
     switch branches here. Make a worktree and write everything in it:

     ```sh
     git fetch origin
     git worktree add .claude/worktrees/plan-<slug> -b plan/<slug> origin/main
     ```
   - two different paths mean this session already has a worktree of its own: `git fetch origin`,
     then `git switch -c plan/<slug> origin/main` here.

   A session that has made its worktree keeps it: `/feature` after `/ideate` writes where
   `/ideate` wrote. A branch that holds a new sprint carries its number: `plan/S-013-due-dates`.
2. **Number a new sprint** one higher than the highest `S-` number among the folders in
   `docs/board/sprints/` and `docs/board/sprints/done/` — in the main checkout and in your
   worktree — and the plan branches, here or on origin (`git branch -a --list "*plan/*"`).
3. **Write only what a plan branch may hold.** The sprint lead refuses a branch that touches
   anything else:
   - a new sprint folder, `docs/board/sprints/S-NNN-slug/`, or changes inside one that is still
     `planned`;
   - new files in `docs/board/inbox/`, `docs/adr/proposed/`, `docs/research/` and
     `docs/reviews/`;
   - `docs/GLOSSARY.md` and `docs/board/LATER.md` — add or replace an entry, never reorder the
     file: two sessions' entries then merge without a conflict;
   - a stack skill's folder, `.claude/skills/<part>/`, new or refreshed, written by a skill
     writer as `docs/STACK_SKILLS.md` says — never a command's folder;
   - for a retro alone: `docs/FEATURES.md`, `docs/CODING_STANDARDS.md`, `.claude/skills/`, the
     sprint's `retro.md`, and the move of that sprint's folder into `docs/board/sprints/done/`.

   Never `docs/board/BOARD.md`, `docs/board/log/`, `docs/PROGRESS.md`, the root `CLAUDE.md`, a
   numbered ADR, source code or a test. A planning session plans; a sprint does the work.
4. **Show the owner** what you wrote, and change what they ask.
5. **Land it.** Commit only those files — `docs: plan S-013 — due dates`, `docs: story — the
   autosave drops a keystroke`, `docs: retro S-012` — and `git push -u origin plan/<slug>`: a
   backup, not a request, since there are no pull requests (ADR-0009). The sprint lead merges
   the branch into `main` at its next wave planning, lists what is new on the board, and removes
   the branch and the worktree. Tell the owner that it waits there until it is brought in:
   `/autopilot` merges it by itself, and `/implement` offers to.
