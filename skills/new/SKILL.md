---
name: new
description: Start something new with the bearly-coding workflow - asks first what you are doing, then sets up a software project with a board of sprints, a light workspace for tool or content work, or a folder for thinking an idea through, and says what to do next.
argument-hint: '[what you want to do, a project name, or a folder]'
disable-model-invocation: true
---

Start something new with the bearly-coding template, which is in `${CLAUDE_PLUGIN_ROOT}`.

What I typed after the command: $ARGUMENTS

**First, ask me what we are doing** — unless what I typed already makes it plain — with these
three answers, one line each:

1. **Build software** — an app, a website, an API, a game, code that generates something.
2. **Tool or content work** — 3D assets, data work, scripts: made with code or tools, but not
   a product.
3. **Just ideate** — think an idea through, without building anything yet.

Then follow that answer's route, and nothing else. Never delete or overwrite anything to make
room: each script fills a folder only while it is empty, and if it refuses, tell me and stop.

The scripts need Node 20 or newer. If one does not start, tell me what it printed and stop.

## 1. Build software

**What earlier runs remembered.** Run this first, and read what it prints:

```sh
node "${CLAUDE_PLUGIN_ROOT}/scripts/new-project.mjs" --settings "${CLAUDE_PLUGIN_DATA}/settings.json" --print-settings
```

It prints three folders as JSON, each `null` until I have given it once:

- `root` — where my projects go. Each project becomes a folder in it.
- `vault` — where a copy of every secret goes: a folder of its own, outside every repository,
  ideally on a drive that is backed up or synced privately. The project gets a subfolder
  there, created empty; nothing is written into it before Phase 0 has confirmed the path with
  me again.
- `skills` — a folder of stack skills from my earlier projects, one subfolder per skill, each
  with a `SKILL.md`. The new project's skill writers start from the ones that match its
  stack.

**The name.** The project's name, and optionally the folder it goes in, come from what I typed.
If I typed no name, the project is the folder this session is open in: its name is the name,
and its parent is the root for this run. Ask me for a name instead if that folder's name is
not lower-case with hyphens, as the repository will be called.

**Ask me, in one go, only for what is still missing**: the root, if none is remembered and the
project is not the current folder; the vault, if none is remembered — "none" is an answer, and
Phase 0 then asks for it; and say in one line that I can name a skills folder, if none is
remembered — "none" is the usual answer.

Then run the script and show me what it prints:

```sh
node "${CLAUDE_PLUGIN_ROOT}/scripts/new-project.mjs" --settings "${CLAUDE_PLUGIN_DATA}/settings.json" --name <name>
```

Add `--root <folder>`, `--vault <folder>` or `--skills <folder>` for each folder I gave just
now or named in what I typed, and `--no-vault` or `--no-skills` where I said none. A folder I
give is remembered for the next project. Do nothing else — no repository on GitHub, no
Phase 0, no file of your own. Then tell me the steps the script printed: a fresh session in the
new folder and `/ideate` with the raw idea — say which kind of software it is, so it asks the
right questions — then `/kickoff` in another fresh session.

## 2. Tool or content work

Ask me for the folder path, and what it is for, in a sentence. Then:

```sh
node "${CLAUDE_PLUGIN_ROOT}/scripts/new-workspace.mjs" --kind light --path <folder>
```

Fill in the slots of its `CLAUDE.md` from a few questions, one at a time: what is being made
and with which tools, how a result is checked, and whether GitHub stores it. GitHub is version
control only, and only if I say so: then `gh repo create <name> --private --source <folder>`,
never public. Stage the two hooks as executable —
`git add --chmod=+x .githooks/pre-commit .githooks/pre-push`, since on macOS and Linux git
skips a hook that is not — and make the first commit. The TruffleHog hook runs on it; if
`trufflehog` is not installed, tell me to install it and stop. Push only if I chose GitHub. Then tell me to open a
fresh session in that folder for the work itself.

## 3. Just ideate

Ask me for the folder path. There is no default: ask every time, and use only the path I give.
Then:

```sh
node "${CLAUDE_PLUGIN_ROOT}/scripts/new-workspace.mjs" --kind ideate --path <folder>
```

Then interview me one question at a time, hardest first, until you are about 95% sure what I
actually want: who it is for, what they do today instead, the one feature without which it is
worthless, what must never happen, what is out of scope. Push back where it is vague or bigger
than it needs to be. Keep the folder's `CLAUDE.md` current as things settle, and write the
result into `brief.md` there. Then tell me that `/bearly-coding:new` with "build software",
and `/ideate` with that brief, turn it into a project. No git and no GitHub on this route.
