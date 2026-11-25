# Upgrade prompt — move an existing project onto the board, sprints and waves

> In a fresh session opened **in the existing project's directory**, type
> `/bearly-coding:update`. It picks this prompt when the project has no board yet.
>
> It works whatever the project has today for planning and notes: a `PLAN.md` with steps, task
> files, a feature table, a living-context file, a prompt log — or nothing but code. Nothing is
> written until you have approved the migration map it shows you. Source code is not touched,
> apart from wiring the fast verify and deleting comments that silenced a file-length rule. A
> project that already runs the board uses `update-project.md` instead.

---

```text
Upgrade this project to the workflow of the bearly-coding template: a board of sprints and
stories, built in waves. The command that sent you here named the template's folder; below it
is <template>. Its scaffold is in <template>/scaffold/, and every path below that starts with
scaffold/ is in there. The decisions behind the workflow are in
scaffold/docs/adr/ADR-0005-sprints.md and, amending it, ADR-0007-lighter-verification.md,
ADR-0008-contexts-are-kept-small.md, ADR-0009-github-for-version-control-only.md,
ADR-0011-sprints-as-folders.md, which also has today's words,
ADR-0012-by-hand-and-on-autopilot.md and ADR-0013-a-sprint-lead-for-every-sprint.md; the rule
on code in scaffold/docs/adr/ADR-0010-no-file-length-limit.md; and how a project gets the
skills for its stack in scaffold/docs/adr/ADR-0014-stack-skills-written-by-the-project.md.

This is a process migration. It changes how work is written down and landed; it does not
change the product. Do not modify source code except to wire the fast verify command and to
delete a comment that silences the file-length rule.

## 1. Survey — read only

Read the template first: scaffold/CLAUDE.md, scaffold/docs/PRIME_DIRECTIVES.md,
scaffold/docs/PLANNING.md, scaffold/docs/AGENT_WORKFLOW.md, scaffold/docs/ORCHESTRATION.md,
scaffold/docs/PROGRESS.md, scaffold/docs/GLOSSARY.md, scaffold/docs/FEATURES.md,
scaffold/docs/CODING_STANDARDS.md, scaffold/docs/STACK_SKILLS.md, scaffold/docs/board/ (all of
it), scaffold/.claude/ (settings, launch.json, bearly.json, the six agents, and the commands
in skills/), scaffold/.githooks/, scaffold/.gitattributes, scaffold/docs/SECRETS.md,
scaffold/tools/inspector/README.md (not the code beside it), the comment block of
scaffold/tools/context-report.mjs (not the code below it), and ADR-0005 to ADR-0014. Read the
ADRs before ADR-0011 with the table in ADR-0011: what they call a story is a sprint, a task a
story, and a sprint a wave. Write this project in today's words only.

Then this project, top down, and never scan the whole repository:
- CLAUDE.md, and every doc it points to.
- Planning: any PLAN, PHASE_PROMPTS, kickoff brief, FEATURES or FEATURE_TABLE, docs/tasks/,
  docs/specs/.
- State: any PROGRESS, CONTEXT or LIVING_CONTEXT file.
- History: any HISTORY_LOG, prompt log or other append-only record.
- Words: any glossary, terminology section or list of core concepts; and any list of what was
  parked, deferred or decided against.
- Rules: prime directives wherever they live, and the ADRs wherever they live (docs/adr/,
  docs/decisions/, …) — note the numbering scheme and the highest number. Any CONTRIBUTING,
  style guide or coding standards.
- Tooling: .claude/ (settings, agents, skills), .agents/, .github/, the verify command and
  what it runs, the package manifest's scripts, and the configuration of each linter, formatter,
  unused-code check and dependency or architecture check. Anything that limits a source file's
  length, and any comment that silences it, by name only.
- Git: git status, git branch -a, gh pr list, and whether main is protected
  (gh api repos/{owner}/{repo}/branches/main/protection — a 404 means it is not).
- Git hooks: git config core.hooksPath, and any .husky/, .pre-commit-config.yaml or
  .git/hooks/ script that is not a sample. Whether trufflehog --version runs.
A file longer than a few hundred lines: read its headings and the first screen of the sections
you need. Never load a multi-thousand-line file whole.

Stop and tell me before going further if there is work in flight: uncommitted changes, an open
step/ or feature pull request, or a half-finished task. It gets finished or parked first.

## 2. Ask — everything in one go

- How many agents may run in parallel in total, of any kind? 1 is the sequential workflow, and
  sprints can still be added while it runs. Suggest 3.
- Whether autopilot pushes and deploys a finished sprint as soon as its review is clean, or
  only on my yes: land: auto or land: ask. Suggest auto.
- Which commands make up the fast verify: typecheck, lint, the architecture check and unit
  tests, with no ports, servers, containers or emulators. Propose them from the existing
  scripts, and say what the full verify runs that the fast one must not.
- The secrets vault: confirm the path the project already records, or ask for one — a folder
  outside every repository, one per project, on a drive that is backed up or synced privately.
- How much of GitHub the project should use. The default is version control only (ADR-0009):
  no Actions, no pull requests, no branch protection, no Dependabot; every test, verify and
  TruffleHog scan local, and autopilot deploys. The alternatives are a pull request per
  sprint and a deploy from Actions (ORCHESTRATION.md, "Using more of GitHub").
- If it deploys from CI today: the deploy command autopilot will run instead, and where
  its credentials live on this machine — the local .env or the host's own login. Never print a
  value; tell me which GitHub repository secrets would have to move.
- If trufflehog does not run: that I install it first. Nothing can be committed after the
  migration without it.
- Each word you found used for two things in the project's documents: which meaning it keeps.
- Anything in the migration you cannot decide from the documents — ask, do not guess.

## 3. The migration map — write nothing yet

Show me one table: every existing planning, state, history and rules file or section → its new
home → how (keep, convert, merge, move to docs/archive/, or delete). Apply these rules:

- **History is never edited or lost.** An append-only log moves unchanged to docs/archive/.
  docs/board/log/ starts with before-the-board.md: a few lines on what the project achieved
  before the migration, pointing at the archived log. Wave files follow it, from wave-0001.md.
- **What is built goes into docs/FEATURES.md**: one entry per capability the product has
  today — what a user can do, the rules that must keep holding, where it lives — built from
  the existing spec or feature table, whose file moves to docs/archive/ unchanged and is named
  in the entry. A finished feature gets no sprint folder.
- **What is still to build becomes sprints**: one folder per outcome,
  docs/board/sprints/S-NNN-slug/, its sprint.md built from the existing spec where there is
  one. Its stories carry the remaining work, from the template's _TEMPLATE-story.md — ready if
  they meet the definition of ready, Backlog with what they lack otherwise. Cut slices, not
  layers, and design for side-by-side work: contract changes first as Solo stories, disjoint
  owned paths that list every shared file. Known debt and open bugs become stories of S-000.
  The order of the sprints on the board is the order of the old plan.
- **The project's words go into docs/GLOSSARY.md**: the terms its documents already define or
  use consistently, each in the template's format, with the words it replaces. Take them from
  the documents; do not invent any. A word used for two things takes the meaning I gave in
  section 2, and the other use gets a line under "Flagged ambiguities".
- **What was parked or refused goes into docs/board/LATER.md**: a "later" list, an
  out-of-scope list, a rejected proposal with its reason.
- **docs/CODING_STANDARDS.md is the template's**, with its baseline. A rule of an existing
  CONTRIBUTING or style guide goes under "This project's standards" only if it takes judgement
  to check; what a linter, a formatter or a type checker already enforces is left out. Show me
  each rule you move and each you leave.
- **Living context becomes docs/PROGRESS.md** — where we are, last decisions, known debt, blocked
  on the owner, environment, known limitations. Long narrative that no longer describes the
  present moves to docs/archive/.
- **What waits on me becomes inputs**: one file in docs/board/inputs/ for each thing the
  project's documents say only I can do or decide — a cloud resource, a secret to place, an
  open question — from the template's _TEMPLATE-input.md, numbered from I-001, each with its
  line under "Blocked on the owner" in docs/PROGRESS.md and, where it holds up a story, its id
  in that story's row in Blocked. Never a secret's value in one.
- **Directive numbers never change.** Keep every existing directive under its number. A
  directive the new workflow replaces keeps its number with its text reduced to "superseded by
  N". The template's rules this project lacks — the two verify tiers, a sprint that lands
  whole, parallel only when provably independent, one writer for shared state — are appended
  under new numbers after the highest one. A directive this project already has on what gets a
  test, or on CI running the tests, keeps its number and takes the template's wording (its
  directives 14 and 23, ADR-0007, ADR-0011).
- **No test is deleted, skipped or changed.** The template's narrower rule on what gets a test,
  and its rule that a test is written first, are about what is written from now on. Tell me
  how long the full verify takes and which end-to-end tests go beyond one path per feature;
  thinning them is my decision.
- **No limit on file length (ADR-0010).** This is my decision, so removing the rule weakens no
  gate. A directive this project already has on file length keeps its number and takes the wording
  of the template's directive 12; if it has none, that wording is appended under a new number.
  Each thing that limits a source file's length goes: a linter rule (max-lines, max-module-lines,
  file-length, too-many-lines, or the stack's own name for it), a script, a test that walks the
  repository. So does a comment that silences it, such as eslint-disable max-lines, and a test
  that only proves the rule fires; a test that also proves other rules loses only this rule's
  case. That is the one exception to "no test is deleted". Show me each in the map. Files already
  split stay split, and no existing code is rewritten. The context files' line budgets and the
  narrow-read rule of ADR-0008 stay. The agents implementer.md and verifier.md use this project's
  number for the directive, and docs/CODING_STANDARDS.md does too.
- **ADR numbers never change either.** Keep the project's ADRs where they are, in its own
  numbering scheme. The template's reasoning arrives as this project's next ADRs, each in
  today's words — "adopt the board, sprints and waves", adapted from ADR-0005 as ADR-0007,
  ADR-0009, ADR-0011, ADR-0012 and ADR-0013 amend it, without the history of the words that
  changed; the
  inspector, adapted from ADR-0006 with every exclusion you added; the smaller contexts,
  adapted from ADR-0008; no limit on file length, adapted from ADR-0010; and stack skills
  written by the project, adapted from ADR-0014 — and, if the project has none, a dependency
  ledger adapted from ADR-0003. Point the protocol docs at the project's ADR directory.
- **Protocol files come from the template, with this project's real values** in place of every
  placeholder: docs/PLANNING.md, docs/AGENT_WORKFLOW.md, docs/ORCHESTRATION.md,
  docs/STACK_SKILLS.md, docs/board/
  (BOARD.md, the three templates, sprints/S-000-maintenance/sprint.md, sprints/done/README.md,
  inbox/README.md, inputs/README.md, log/README.md), docs/adr/proposed/README.md,
  docs/SECRETS.md — merged with the project's
  own inventory — and the two lines of .gitattributes that let the glossary and LATER.md merge
  without a conflict. Where the project already has an ORCHESTRATION or AGENT_WORKFLOW file
  with project-specific content, keep that content in a "Project notes" section of the new
  file.
- **Commands come from the template too**: .claude/skills/ gets standup, ideate,
  feature, fix, refactor, implement, autopilot, resolve, sprint-review, project-review, retro,
  stack-skills and board, each with this project's name, commands and paths — not kickoff, and
  not ideate's
  PROJECT.md, which is for a project that has no Phase 0 yet. A phase prompt this project
  already has keeps its project-specific rules, moved into the command that replaces it.
- **The inspector is copied, never adapted**: tools/inspector/ is the template's folder byte for
  byte — copy it with the shell, do not read its code. Each linter, formatter, unused-code check
  and dependency or architecture check leaves tools/inspector/ out, one line per tool, each
  shown to me in the map: the folder is vendored and no part of the product, so this weakens no
  gate. .claude/launch.json gets the template's inspector configuration, with the port that
  `node tools/inspector/serve.mjs --print-port` prints. The same holds
  for tools/context-report.mjs, which measures each agent's context for the log
  (ADR-0008): copied byte for byte, and left out of the same checks.
- **.claude/**: add the template's sprint-lead, implementer, verifier, reviewer and architect,
  adapted; keep any other agents; the template's effort comes with them — `high`, and `max`
  for the verifier and the reviewer — and so does `permissionMode: dontAsk`: on autopilot no
  agent asks for a permission (ADR-0013). Merge settings.json — add "model": "opus",
  "autoCompactWindow": 400000, the env entries that turn agent teams off and set
  CLAUDE_CODE_EFFORT_LEVEL to high, the hook for a compaction, and the template's allow
  entries; keep every existing entry and every deny. Then show me the allow-list next to every
  command this project's verify, build and deploy run that no rule covers, and write only the
  rules I pick: an agent that never asks is refused whatever is not on the list. Never a rule
  for rm, for a website, or for writing under .claude/. Add the template's skill-writer as
  well: the one agent with no permission mode, since it runs only in a session I am in
  (ADR-0014). And .claude/bearly.json is the template's, with today's date as "created".
- **The stack's skills are written afterwards, not here.** Skills already in .claude/skills/
  stay as they are, and so does a .agents/skills/ folder from a skills installer. In the map,
  list the parts of this project's stack as docs/STACK_SKILLS.md defines a part, and say which
  have a skill. A session only knows the agents it started with, so the skill writer cannot
  run in this one: once this has merged, `/stack-skills` in a fresh session has a skill
  written for each part that has none.
- **.gitignore** gets .claude/worktrees/ and .claude/skill-drafts/.
- **CI goes, and the git hooks come** (ADR-0009), unless I answered otherwise. First show me
  in the map every workflow job and what replaces it: the tests and the verify run locally —
  the full verify by the sprint lead, once per wave; the secret scan becomes the hooks; a
  deploy becomes the command I named, run by the sprint lead after each sprint lands, allowed
  in settings.json; anything else — a schedule, a release, a bot — is my decision, so list
  it and wait. Then .github/ is deleted. .githooks/pre-commit and pre-push are the template's
  files byte for byte, copied with the shell, added with git add --chmod=+x and switched on
  with git config core.hooksPath .githooks; hooks the project already has are shown to me and
  left alone. The whole history is scanned once — sh .githooks/pre-push --all — and a finding
  stops the migration until I have seen it; a deliberate fake in a test gets the comment
  trufflehog:ignore at the end of its line from now on.
  settings.json takes the template's denies on --no-verify, force pushes, gh pr create,
  gh workflow and writing .github/workflows/. If I keep something on GitHub, apply "Using more
  of GitHub" in ORCHESTRATION.md instead, and write it into the ADR.
- **The root CLAUDE.md** takes the template's structure — read-first list with the glossary,
  directives short form, repo map with docs/board/, tools/inspector/ and
  tools/context-report.mjs, commands with both verify tiers, read-X-when-Y, definition of done
  for a story, a wave and a sprint — and keeps everything project-specific it had.
- **Retired files are deleted only when every line of them has a new home** in the map: a PLAN
  whose steps became sprints, a FEATURES table whose rows became entries of docs/FEATURES.md,
  task files that became stories, phase prompts replaced by the commands.

Under the table, list the files you will create, change, move and delete, and the first wave
you would plan from the new board — which stories, and why they are independent. Then stop and
wait for my yes. Change the map when I ask.

## 4. Migrate — after my yes

1. Branch chore/adopt-sprints from an up-to-date main.
2. Commit in reviewable pieces, one area per commit: archive, the feature list and the
   glossary, the board, progress, directives and ADRs, protocol docs, .claude/ with the
   commands, the inspector and the context report with their exclusions, CLAUDE.md, the fast
   verify, the file-length rule with its suppressions, the hooks and .github/ removed. From the
   hooks' commit on, every commit goes through TruffleHog: never --no-verify.
3. Run the fast verify and the full verify; both green. The fast one must start no server,
   container or emulator.
4. Check nothing points at a retired file: grep the repository for the old file names, and for
   step/ branches and the old task numbers. Check no command still holds a placeholder in
   double braces. Prove the inspector runs, without looking at it: start
   `node tools/inspector/serve.mjs --no-browser`
   in the background, fetch http://127.0.0.1:<port>/api/state with curl and check it lists
   docs/board/BOARD.md, then stop it. Prove the context report finds this project's
   transcripts: `node tools/context-report.mjs --since <an hour ago>`
   lists this session. Search for "Files stay under", "max-lines", "line limit" and "file-length":
   each hit is in an ADR or a place you missed.
5. Check the board: every story meets the definition of ready or sits in Backlog saying
   why; no two stories share an id; every Depends on names a story that exists; every sprint
   folder has its row in BOARD.md, in the order it is to be built.
6. Push the branch — the pre-push hook scans it. Do not merge it: I review this one myself.
   With ADR-0009, the merge is local, and it waits on me twice: my yes, and — if main is
   protected — my turning the protection off on GitHub first, since a protected main refuses
   the push. Then git switch main, git merge --no-ff chore/adopt-sprints, git push origin main.
   If I kept pull requests, open one instead, "chore: adopt the board, sprints and waves
   (ADR-NNNN)", with the migration map as its body.

## 5. Report

The branch, both verify outputs, the TruffleHog result over the whole history, what went to
docs/archive/, anything you could not map and how you left it, each exclusion and the tool it
went into, each file-length rule, test case and suppression removed, each term you put into the
glossary and each standard you moved, what I have to do on GitHub
myself — turn off branch protection on main, disable
Actions, and delete each repository secret once it lives on this machine — and what I do once
it has merged: open a new session so the commands and agents are picked up, then /stack-skills
to have a skill written for each part of the stack, /standup to see where things stand,
/resolve to go through what waits on me, /implement to build the first story with me or
/autopilot to let it run, and /board to watch it.

Never push to main before my yes, never merge with --admin, never touch branch protection,
never delete or skip a test beyond the file-length rule's own, never put a secret anywhere but the vault, and never make anything
public.
```
