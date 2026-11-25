# Update prompt — bring a project that already runs the board up to the current template

> For a project that already has `docs/board/BOARD.md` in the template's shape: sprints as
> folders, stories as files. It compares the project's workflow files with the template's and
> brings over what the template has gained since — a command, an agent, a rule of the protocol,
> a fix in the vendored tools or in the git hooks. Run it again whenever the template has
> changed: it compares before it copies, and a part the project already has is skipped.
>
> In a fresh session opened **in the project's directory**, type `/bearly-coding:update`.
>
> Nothing is written until you have approved the list of changes it shows you. Source code and
> tests are not touched. A project that is not on the board yet uses `upgrade-project.md`
> instead.

---

```text
Bring this project up to date with the bearly-coding template. The command that sent you here
named the template's folder; below it is <template>, and its scaffold is <template>/scaffold/.
The project already runs the board and sprints; this adds what the template has gained since.

This is a process change. It changes how I start work, how I watch it and how it is checked; it
does not change the product. Do not modify source code or any test. Do not modify any check,
except to leave the vendored tools out of it, as section 3 says.

Compare before you change anything. A part this project already has, as the template has it,
is not on the list — say in one line that it is there. This project's own text wins wherever it
says something the template does not: what you bring over is what the template added or
changed, never a rule this project wrote for itself.

## 1. Survey — read only

The template: <template>/CHANGELOG.md first, which says what changed, newest first. Then, in
<template>/scaffold/: CLAUDE.md, README.md, .claude/README.md, .claude/settings.json,
.claude/launch.json, .claude/bearly.json, every agent in .claude/agents/, every command in
.claude/skills/ but kickoff, .githooks/ (both hooks), .gitattributes, .gitignore,
docs/PRIME_DIRECTIVES.md, docs/PLANNING.md, docs/AGENT_WORKFLOW.md, docs/ORCHESTRATION.md,
docs/STACK_SKILLS.md, docs/SECRETS.md, docs/CODING_STANDARDS.md, docs/board/ (every file),
docs/adr/ (the titles, and each record this project has no counterpart of),
tools/inspector/README.md and the comment block of tools/context-report.mjs — not the code of
either.

This project, and never the whole repository:
- The same files, where it has them. Compare each with the template's —
  git diff --no-index --stat <template>/scaffold/<file> <file> — and read a difference only
  where the stat shows one. A placeholder in double braces on the template's side stands for
  this project's value: that is not a difference.
- .claude/ — settings.json, launch.json, bearly.json, the agents, the commands, and the names
  and descriptions of the stack's skills. Never the body of a stack skill: those are this
  project's own.
- The checks: what the fast and the full verify run, and how each linter, formatter,
  unused-code check and dependency or architecture check leaves a path out.
- Its ADRs: where they live, their numbering scheme and the highest number.
- The board, by name and count only: git ls-files docs/board | sed "s|/[^/]*$||" | sort |
  uniq -c. Whether it is in the template's shape: a "Sprints" section in BOARD.md, folders
  named S-NNN-slug under docs/board/sprints/, and what waits on me as files in
  docs/board/inputs/.
- Git: git status, git branch -a, git config core.hooksPath, whether trufflehog --version runs,
  and whether a sprint is in flight.

Stop and tell me before going further if:
- a sprint is in flight — a sprint/ branch, or current_sprint or current_wave set in
  BOARD.md — a plan/ branch waits to be merged, or the working tree is not clean. This lands
  between sprints: it rewrites files the sprint lead owns.
- .claude/bearly.json names another library. That library made this project, and its own
  update command is the one to run.
- the board is not in the template's shape. This prompt brings a board up to date; it does not
  convert one.

## 2. Ask — everything in one go, and only what the documents do not answer

- The inspector's port, if .claude/launch.json names none: the number
  node <template>/scaffold/tools/inspector/serve.mjs --print-port --project . prints, unless I
  want another.
- If trufflehog does not run: that I install it first. Nothing can be committed without it.
- Each place where this project's text and the template's say different things about the same
  subject, and you cannot tell which is this project's own rule and which is an earlier
  wording of the template's: quote both, and ask.

## 3. The list of changes — write nothing yet

Show me every file you will add, change or delete, and for each changed check the exact line
you will add. Apply these rules:

- **Vendored files are copied, never adapted.** tools/inspector/ and tools/context-report.mjs
  are the template's byte for byte, and so are .githooks/pre-commit and pre-push: copy them
  with the shell, do not read their code and do not retype it. Where one is already here and
  differs, say so: either the template changed it, or it was edited here, which it never
  should be. The hooks are added with git add --chmod=+x and switched on with
  git config core.hooksPath .githooks; if they are new here or changed, the whole history is
  scanned with them once in section 4. If the project has other hooks of its own — a hooks
  path, .husky/, a pre-commit framework — show me and change nothing there: chaining them is my
  decision.
- **A vendored file the template no longer has goes.** A tool this project got from an earlier
  version of the template, and that the template has since replaced, is removed with git rm,
  and every line that ran it — in a command, an agent, the protocol, .claude/launch.json, an
  allow rule — takes the template's line. List each. Say so if the replacement needs something
  this machine lacks: the tools run on Node 20 or newer.
- **The checks leave tools/inspector/ and tools/context-report.mjs out** — each linter,
  formatter, unused-code check, dependency or architecture check, coverage setting, and any
  test that walks the repository. One line per tool, in that tool's own way of ignoring a path,
  each shown to me first. This weakens no gate: both are vendored, are no part of the product,
  and nothing imports them. Change nothing else in any check.
- **Commands**: each .claude/skills/<command>/SKILL.md takes the template's frontmatter and
  body, and keeps every rule, command and path that is this project's own — tell me each one
  you carried over, and each you could not place. A command the template has and this project
  lacks is new: the template's, with this project's name, commands and paths. Never kickoff,
  and never ideate's PROJECT.md: they are for a project that has no Phase 0 yet. A command
  this project has and the template does not is this project's own: leave it.
- **Agents**: each .claude/agents/<name>.md takes the template's frontmatter and text, with
  this project's values and directive numbers, and keeps every line that is this project's own.
  An agent the template has and this project lacks is new. If skill-writer.md is new here,
  tell me that `/stack-skills`, in a fresh session after this has merged, has a skill written
  for each part of the stack that has none.
- **The stack's skills are this project's.** Never replace, rewrite or delete one. A skill
  without the "Sources" and "Not yet confirmed" lists of docs/STACK_SKILLS.md is listed for
  me, with the command that refreshes it.
- **The protocol is the template's, with this project's values and its own additions kept**:
  docs/PLANNING.md, docs/AGENT_WORKFLOW.md, docs/ORCHESTRATION.md, docs/STACK_SKILLS.md, the
  README files and templates under docs/board/, docs/adr/proposed/README.md, and the rules of
  docs/SECRETS.md — never its inventory. Say where each addition of this project's went.
- **The directives keep their numbers.** Find each by subject, since this project's numbers
  may differ, and give it the template's wording under its own number. A directive the
  template has and this project lacks is appended after the highest one. Agents, commands and
  docs/CODING_STANDARDS.md use this project's numbers.
- **The context files say it once each**: CLAUDE.md — the read-first list, the short form, the
  repo map, the commands, read-X-when-Y and the definition of done — within its line budget;
  the hand-off in docs/PROGRESS.md; the table of commands in README.md; .claude/README.md.
- **.claude/settings.json**: add the template's entries this project lacks — allow, deny, the
  hook, the model, the env entries — and keep every existing entry and every deny. An allow
  rule that ran a file the template no longer has goes with that file. Then **go through the
  allow-list with me**: an agent on autopilot never asks, so it is refused whatever is not on
  the list. From the last ten files of docs/board/log/ and the Verify lines of the open
  stories, list every command this project's agents ran or will run that no allow rule covers,
  each with what it is for, and say which you would allow. I decide, and you write only what I
  picked. Never an entry that deny names, never a rule for rm, and never a rule for a website
  or for writing under .claude/.
- **.claude/launch.json** gets the template's `inspector` configuration with this project's
  port, added to whatever the file already holds.
- **.claude/bearly.json**: if it is missing, add the template's, with today's date as
  "created". If it is there, leave it.
- **.gitignore and .gitattributes** gain the template's lines they lack. Nothing is removed.
- **One ADR for each part this project gains**, under its next numbers, in its own numbering
  scheme: adapted from the template's record of that part, in today's words, with what this
  project decided differently and every exclusion you added. Amend nothing in an existing ADR
  beyond a "see ADR-NNNN" line where one now says something that is no longer so.
- **No test is deleted, skipped or changed, and no source is touched.**
- **Budgets hold.** Every file with a line budget stays within it; if one would not, say which
  and what you would move out.

Then stop and wait for my yes. Change the list when I ask.

## 4. Apply — after my yes

1. Branch chore/template-update from an up-to-date main.
2. Commit in reviewable pieces, leaving out what this project already had: the vendored tools
   with their exclusions and launch.json; the hooks; the commands; the agents; the settings;
   the protocol and the directives; the context files; the ADRs. Every commit goes through the
   pre-commit hook: never --no-verify.
3. If the hooks were new or changed, scan the whole history with them once:
   sh .githooks/pre-push --all. A finding stops the update: tell me what it found, in which
   commit and file, and write nothing more until I have said what it is.
4. Run the fast verify and the full verify, once each: both green, and no slower than before.
5. Prove the inspector runs, without looking at it: start
   `node tools/inspector/serve.mjs --no-browser` in the background, fetch
   http://127.0.0.1:<port>/api/state and check it names this project and lists
   docs/board/BOARD.md, then stop it. No screenshot. Then prove the context report finds this
   project's transcripts: `node tools/context-report.mjs --since <an hour ago>` lists this
   session.
6. Check the commands: each SKILL.md has a name, a description and
   disable-model-invocation: true, and no placeholder in double braces is left in any of them.
   Check the agents: every one but the sprint lead and the skill writer has
   isolation: worktree, and every one but the skill writer has permissionMode: dontAsk.
7. Check nothing points at a file that went: search the repository for the name of each file
   this update removed. Each hit is in an ADR that records the earlier way, in
   docs/board/log/, or a place you missed.
8. Check the board is untouched: git diff --stat main -- docs/board/sprints docs/board/log
   shows nothing.
9. Push the branch, if this project has a remote — the pre-push hook scans it. Do not merge
   it: I review this one myself. After my yes: git switch main,
   git merge --no-ff chore/template-update, and git push origin main if there is a remote.
   Never touch branch protection yourself.

## 5. Report

The branch; both verify outputs and how long the full one took; each file added, changed and
removed; each exclusion and the tool it went into; each rule of this project's you carried over
or could not place; each allow rule I picked; each stack skill that wants a refresh; the
TruffleHog result, if the history was scanned; and what I do next: say yes to the merge, open
a new session so the commands and agents are picked up, then /standup — and /stack-skills if a
part of the stack has no skill.

Never push to main before my yes, never merge with --admin, never touch branch protection,
never delete or skip a test, never put a secret anywhere but the vault, and never make
anything public.
```
