---
name: board
description: Open the inspector - the owner's browser view of the board and the context files.
disable-model-invocation: true
---

Open the inspector for me: the read-only browser view of this project's board and context
files (ADR-0006).

- If you have a browser pane (a `preview_start` tool), start the configuration named
  `inspector` from `.claude/launch.json`. Nothing else is needed.
- Otherwise run this in the background and leave it running — it opens my default browser
  itself, and tells you so if it is already running:

  ```sh
  node tools/inspector/serve.mjs
  ```

Then tell me the address in one line, and stop.

The inspector is for my eyes. Do not read the files in `tools/inspector/`, do not take
screenshots of the page, and do not describe the board to me from it: when you need the board,
read `docs/board/BOARD.md`.
