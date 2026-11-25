# {{TITLE}}

A light workspace for tool or content work — 3D assets, data work, scripts — made by
`/bearly-coding:new` on {{DATE}}. Not a product: no board, no sprints, no architecture rules, no
verify gates. Git keeps the history, and GitHub, if it is used at all, only stores it. Keep this
file under 60 lines: it is read at the start of every session here.

## What this is

_[One or two sentences: what is being made, with which tools, and for what. "Procedurally
generated low-poly trees for a Unity scene, made in Blender 4.x with Python scripts."]_

## Layout

_[What lives where, once it exists. For example: `inputs/` what goes in, never edited;
`scripts/` what turns inputs into outputs; `outputs/` what comes out — git-ignored if it can
be regenerated.]_

## How a result is checked

_[What "good" means here and how to see it: a render to look at, a file that opens in the
target tool, a number within a range, a script that runs without errors. Whatever it is, it
runs on this machine.]_

## Decided so far

_[Short lines, newest last: tools and versions, formats, what was ruled out.]_

## Rules

- **GitHub stores the repository and nothing else**: no Actions, no pull requests. Whether it
  is pushed at all: _[yes, to the private repository `owner/name` — or no, local only]_. It is
  never made public without the owner's yes.
- **No secret reaches the repository.** TruffleHog checks every commit and every push through
  the hooks in `.githooks/` (`git config core.hooksPath .githooks`, once per clone); both are
  refused without `trufflehog` installed. Never `--no-verify`. API keys live in `.env`, which
  is git-ignored.
- **Large binaries** — meshes, textures, renders, datasets — are git-ignored when a script can
  regenerate them. Ones that cannot are a decision: Git LFS, or a folder outside the
  repository. Write it under "Decided so far".
- Commit small and often, with conventional-commit messages.
