# Inspector

The owner's browser view of this project: the board as four columns — waiting, in progress, in
review, done — what waits on the owner, each line a link to its input in `docs/board/inputs/`,
and every context file rendered, with story, sprint and input ids, ADRs, directives and paths
as links. The decision behind it is ADR-0006.

## Open it

- Type `/board` in a Claude Code session, or
- run `node tools/inspector/serve.mjs` in a terminal opened in the project, or
- in the Claude desktop app, start the `inspector` preview (`.claude/launch.json`).

Press Ctrl+C where it runs, or close that terminal, to stop it. Starting it twice is harmless:
the second start only opens the page.

## What it is

- `serve.mjs`, with `git-state.mjs` — a small server on Node's built-in modules. Node 20 or
  newer and git are all it needs, on Windows, macOS and Linux. It answers this machine only,
  it only reads, and it hands out a file only if git can see it and it is a context file. An
  ignored file such as `.env` cannot be reached through it.
- `index.html`, `inspector.css` and the other `.mjs` modules — the page. Plain HTML, CSS and
  JavaScript: no dependency, no build step, nothing loaded from the network.

The board says which stories are in a wave and in what order. On autopilot, where each one
stands — an agent building, committed on the sprint branch, the verifier or a reviewer reading
the sprint — is read from git, because the board is only rewritten when a wave is planned and
when it is recorded. A story built by hand shows as the board has it. A story counts as in once the sprint branch holds a commit that closes with its id,
`feat: the dialog copies the link (S-012.2)`.

The page asks the server again every five seconds while it is visible. It cannot change
anything: to reorder Ready, edit `docs/board/BOARD.md` between waves.

It also reads a board written before ADR-0011, where a sprint was a story (`ST-012`) with its
folder in `docs/board/` itself, a story a task card (`T-012.3`), a wave a sprint, and the log
one file — and shows it in those words.

## Do not edit it here

This folder is copied from `scaffold/tools/inspector/` in bearly-coding and is the same in
every project. Change it there, with its tests in `tests/inspector/`, and copy it again —
`/bearly-coding:update` does that. It is left out of this project's linter, formatter and
architecture check for exactly that reason, and agents never read it.

## Options

```sh
node tools/inspector/serve.mjs --print-port                  # the port this project uses
node tools/inspector/serve.mjs --port 4800                   # another port, this once
node tools/inspector/serve.mjs --project ../other-project    # look at another project with this copy
node tools/inspector/serve.mjs --no-browser                  # start it without opening a browser
```

The port comes from the `inspector` entry in `.claude/launch.json`. Where that names none, it
is a number derived from the name of the project's folder.
