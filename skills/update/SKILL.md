---
name: update
description: Bring the project in this directory up to date with the bearly-coding template - onto the board and sprints if it is not there yet, otherwise whatever the template has gained since.
argument-hint: '[anything to bear in mind for this run]'
disable-model-invocation: true
---

Bring the project in this directory up to date with the bearly-coding template, which is in
`${CLAUDE_PLUGIN_ROOT}`.

First look at what is here. Stop and say so if:

- this directory is not a git repository, or is the template itself;
- `.claude/bearly.json` names a `library` other than `bearly-coding`. That library made this
  project, and its own update command is the one to run;
- `.claude/bearly.json` says `"kind": "light"`. A light workspace has no board to bring up to
  date. Ask me whether I want to turn it into a project with a board, and go on only on my
  yes — with the upgrade prompt below.

Then pick the prompt:

- If `docs/board/BOARD.md` exists here, the project already runs the board: read
  `${CLAUDE_PLUGIN_ROOT}/prompts/update-project.md`.
- If it does not, read `${CLAUDE_PLUGIN_ROOT}/prompts/upgrade-project.md`.

That file holds a prompt inside a fenced block. Follow that prompt exactly, as if I had typed
it to you as this message — its stops and its questions included. Where it says `<template>`,
that is `${CLAUDE_PLUGIN_ROOT}`.

Anything I typed after the command is to bear in mind for this run: $ARGUMENTS
