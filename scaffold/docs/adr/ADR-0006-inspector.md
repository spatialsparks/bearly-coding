# ADR-0006 — The inspector: a read-only browser view of the board, kept outside the gates

**Date** {{YYYY-MM-DD}}
**Status** accepted — amended by ADR-0011 (it reads the board of sprints, stories and waves,
and still reads a board in the earlier words)

## Context

The board is Markdown (ADR-0005), which is what an agent reads best and what a person reads
worst: thirty Ready rows in one table, a sprint whose only live view is a pull request's body,
and a couple of hundred context files whose references to each other nothing follows. The owner
wants to open one page and see what waits, what is being built, what is being checked and what
is done — and to read the context files with every id a link.

Two facts shaped the answer. A browser cannot read local files or git by itself, so something
has to hand them over. And the board is only rewritten when a sprint is planned and when it
lands: in between, its State column still says `building` for a task that is already merged.
Git knows better — Claude Code locks a worktree while its agent runs, a merged task branch is
an ancestor of the sprint branch, and the verifier checks the sprint branch out detached at its
tip.

## Decision

- **`tools/inspector/`** holds a page of plain HTML, CSS and JavaScript modules, and
  `serve.mjs`, a small server on Node's built-in modules. No dependency, no build step, nothing
  loaded from the network.
- **It only reads.** The server listens on 127.0.0.1 alone and answers GET and nothing else. It
  hands out a file only if git can see it, it is a context file — a `CLAUDE.md` anywhere,
  `docs/**/*.md`, and the agents, skills and settings under `.claude/` — and no folder on the
  way to it is a link out of the project. A file git ignores cannot be reached. The board keeps
  its one writer (directive 29).
- **The board gives membership and order; git gives the live state** of a sprint in flight.
  The orchestrator does nothing for the inspector's sake, and the protocol does not change.
- **It is vendored.** The folder is copied from the bearly-coding template and never edited
  here: a change is made in the template, where its tests are, and copied again
  (`/bearly-coding:update`). So it is no part of
  the product — the linter, the formatter, the unused-code check and `{{ARCHITECTURE_CHECK}}`
  leave `tools/inspector/` out, nothing in the product imports it, and agents never read it.
- **The names it reads are a contract.** It finds each section of `BOARD.md` by its heading
  and each column by its header (`docs/AGENT_WORKFLOW.md` lists them). Everything else about
  the board may change shape.

## Consequences

**Good.** One page shows a sprint as it is, not as it was planned. Nothing about how agents
work changes, and no agent spends a token on it. A board an orchestrator has reworded still
shows what it has, because nothing is read by position.

**Bad.** The exclusions are real: a folder of JavaScript this project's gates do not look at.
That is safe only while the folder stays vendored — the day someone edits it here, unchecked
code lives in the repository. The live state is inferred from how Claude Code uses worktrees
today; if that changes, the inspector falls back to what the board says until the template
catches up. It needs Node 20 or newer and a browser on the owner's machine. It asks for no
password: while it runs, any program running as the owner on this machine can read what the
page reads — the context files, never a secret (directive 16 keeps those out of them). And
renaming a section or a column of the board now breaks something, quietly, in a browser nobody
may be looking at.

**Cost to reverse.** Low: delete `tools/inspector/`, its entry in `.claude/launch.json`, the
`/board` command and the exclusions.

## Alternatives considered

| Alternative | Why not |
| --- | --- |
| GitHub Issues and Projects | Rejected in ADR-0005: the board would leave the repository, and every read would need the network and a token. |
| One inspector outside the projects, in the template | No exclusions and a single copy to maintain, but a project would no longer carry everything it needs. The owner chose a self-contained project. |
| A generated snapshot page, no server | Opens with a double click, but is stale the moment a task moves, and cannot see git. |
| The orchestrator keeps the board's State column current | Costs tool calls in every sprint, and an uncommitted board edit gets in the way of `git merge --abort`. Git already holds the answer. |
| A page that can also edit the board | A second writer for shared state (directive 29). To reorder Ready, the owner edits `BOARD.md` between sprints. |
| A Markdown library and a UI framework | Two dependencies, and a ledger row each (ADR-0003), for a tool that renders one known subset of Markdown. |
| A server in a shell's own language, such as PowerShell | Nothing to install on one system, and no way to run on the others. Node is the one runtime the tools need, on Windows, macOS and Linux. |
