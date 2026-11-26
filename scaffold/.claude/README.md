# `.claude/`

## `settings.json`

Project settings. Seven jobs:

- **`model`** and **`env.CLAUDE_CODE_EFFORT_LEVEL`** — every session here starts on Opus at
  high effort (ADR-0004, ADR-0008), without anyone having to ask for it. The environment
  variable sets a session's default, and it outranks the `/effort` command: to run a session at
  another level, set another value under `env` in `settings.local.json`.
- **`autoCompactWindow`** is `400000`: Claude Code compacts a session when its context reaches
  that many tokens, not at about 967k as it otherwise would (ADR-0008). With a sprint lead for
  every sprint (ADR-0013) the session of `/autopilot` rarely gets there; it matters to a long
  session of your own, and to a lead on a long sprint. A sub-agent takes the number from its
  own definition, from Claude Code 2.1.296 on, and the sprint lead's says the same. Start at
  400k and lower it as the log's numbers allow.
- **`hooks`** — one. After Claude Code has summarised a session's context, it tells the session
  to read its command and `docs/ORCHESTRATION.md` again, instead of going on from the summary
  (ADR-0013). The board and git are the record; a summary of them is not.
- **`env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS`** is `"0"`. With agent teams on, a named
  sub-agent launches as a *teammate* sharing the main checkout, unless the Agent call passes
  `isolation` itself — one forgotten parameter and two agents edit the same files. Waves use
  sub-agents in worktrees instead (ADR-0005), so teams stay off. Project settings outrank user
  settings here, so this holds even if your user settings turn teams on.
- **`allow`** — what this project does constantly: editing files inside the project (`Edit(*)`,
  `Write(*)`), making a folder, running the tests, committing a story, landing a sprint,
  measuring its contexts, opening the inspector. A tracked file is removed with `git rm` and a
  change undone with `git restore`; there is no rule for `rm`, on purpose. For a session of your
  own it means fewer prompts. **For autopilot it
  is the whole of what an agent may do**: the sprint lead and its agents never ask (see
  `agents/` below), so what is not allowed here is refused at once — a prompt nobody answers
  would hold a run for days. Reading files and read-only commands need no rule. Replace the
  `{{PACKAGE_MANAGER}}` entries with the real tool, and add what the stack runs (an emulator, a
  container runtime, a cloud CLI in read-only mode): a story that needs a command that is not
  here is blocked, with an input that names it. Every part of a joined command — `a && b` —
  has to be allowed, and on Windows the PowerShell tool needs rules of its own. The deploy is
  allowed too, so a sprint lead deploys each landed sprint unattended (directive 28). A
  permission rule cannot tell the lead from its agents, so the allow reaches them as well: what
  keeps an implementer, verifier, reviewer or architect from deploying is its brief and directive 28. To
  be asked before a sprint is pushed and deployed, set `land: ask` in `docs/board/BOARD.md`.

  **A repository where no session may commit.** `/implement` never changes git; that is its
  rule, not the harness's. To have the harness refuse it as well — in a repository where every
  change is to be read and committed by a person — move the entries for `git commit`,
  `git push`, `git merge`, `git revert`, `git cherry-pick`, `git reset --merge` and the deploy
  from `allow` to `deny`. `/autopilot` then stops at its first commit, and so does the last
  step of a planning command; `/implement` is not affected. Make that change yourself: a
  session does not loosen, or tighten, its own permissions.
- **`deny`** — the last line under prime directives 16, 18, 26 and 28. Reading `.env`,
  creating or flipping a repository to public, committing or pushing with `--no-verify` (which
  skips TruffleHog), force-pushing, hard resets, recursive deletes, and the GitHub this project
  does not use (ADR-0009): opening a pull request, running a workflow, or writing one into
  `.github/workflows/`. Keep these even when they feel paranoid; they cost nothing until the day
  they do not.

Replace `{{DEPLOY_COMMAND}}` with the command that deploys (`firebase deploy`,
`wrangler deploy`, `terraform apply`, …), and deny the stack's destructive cloud commands — for
Firebase and Google Cloud: `gcloud projects delete*`, `gcloud iam*`, `gcloud firestore*`. No
session needs them: the deploy command ships everything (directive 28).

A deny entry is a backstop, not the rule. The rule is in `docs/PRIME_DIRECTIVES.md` — the deny
list only catches the cases where an agent went for it anyway.

Machine-specific permissions go in `settings.local.json`, which is git-ignored.

## `agents/`

Sub-agent definitions. Five are used by `/autopilot` (`docs/ORCHESTRATION.md`); the sixth
writes stack skills. Each of the five sets its tools, its
model (`opus`), its reasoning effort (`high`; `max` for the two that check, ADR-0008) and its
permission mode; the body is its standing brief. The four that work on a story or read one set
`isolation: worktree`, and the sprint lead passes it on every call as well. It may override
the model per call — `sonnet` for a mechanical story — but not the effort (ADR-0004).

**The five never ask** (`permissionMode: dontAsk`, ADR-0013). A command the settings do not allow
is refused at once, and the agent does the step another way or reports it; nothing waits on a
prompt. Claude Code applies an agent's own mode when your session is in Manual mode, the
default. In Auto mode, or with permissions bypassed, the agents take the session's mode
instead, and neither asks. In "Accept edits" they would still ask before a command that is not
allowed: do not leave a run alone in that mode. Your own sessions — `/implement`, the planning
commands — keep asking, as before.

- `sprint-lead.md` — carries one sprint from the board to `main`, in a fresh context and in
  the main checkout: plans the waves, starts the agents below, integrates, verifies, lands,
  and reports to the orchestrator in a few lines. One at a time (ADR-0013).
- `implementer.md` — executes one story in its own worktree, test first, commits on its story
  branch, runs only the fast verify. Several can run at once.
- `verifier.md` — checks a finished wave against its stories, adversarially, once per wave and
  not once per story (ADR-0007), with the sprint branch checked out detached in a worktree of
  its own. Changes nothing, and does not run the suite again.
- `reviewer.md` — reads finished work along one axis its brief names. Two run side by side
  once per sprint, before it is pushed: one against the sprint's spec, one against
  `docs/CODING_STANDARDS.md` (ADR-0011). `/sprint-review` and `/project-review` start them on
  demand. Changes nothing.
- `architect.md` — cuts a sprint into stories designed to run side by side, and designs
  contracts. Writes documents, not code.
- `skill-writer.md` — writes the skill for one part of the stack from that part's own
  documentation, one writer per part (ADR-0014). The one agent here that is not for autopilot:
  it has no permission mode of its own and no shell, and runs only in a session you are in.
  It takes your session's mode: in the default and accept-edits modes, Claude Code asks you
  before it reads a site and before it writes a skill; in auto mode a background check decides,
  and in bypass mode nothing asks. It would refuse both to an agent that never asks.

## `skills/`

Two kinds of skill share this folder.

**The owner's commands.** Each is typed in a session, with what it should work on as its
argument; without one it asks. All of them set `disable-model-invocation: true`, so only the
owner can start one, and none is loaded into an agent's context.

| Command | Does |
| --- | --- |
| `/standup` | Where things stand, and which command comes next. Changes nothing |
| `/ideate [idea]` | An interview in rounds; the glossary and the decisions written down as they settle |
| `/feature [idea]` | A new sprint, with its spec and its stories: after a short interview, or with none in the session that just ideated |
| `/fix [what]` | One story into `docs/board/inbox/`: a bug, reproduced first, or a small change |
| `/refactor [what]` | A refactoring as a technical sprint, or as one story |
| `/implement [story or sprint]` | By hand: asks which story if none is named, builds that one in your checkout, changes nothing in git, and waits for your review and commit |
| `/autopilot [stop point]` | By itself: a sprint lead for every sprint, each in a fresh context — committed, reviewed and landed — until nothing can move if no stop point is given. Made to run for days; stopping the session turns it off |
| `/resolve [input]` | Through what waits on you in `docs/board/inputs/`, one at a time; writes your answers into the files and nothing else |
| `/sprint-review [what]` | Two reviewers, Spec and Standards, on a sprint, a range of commits or uncommitted work |
| `/project-review [area]` | A survey of the codebase for what is worth improving, written to `docs/reviews/` |
| `/retro [sprint]` | A landed sprint's lessons moved to where they are read; its folder to `sprints/done/` |
| `/stack-skills [parts]` | The skill for a part of the stack written or refreshed, one skill writer per part; without a part, every part that has none |
| `/board` | Opens the inspector |

`/kickoff`, and the file `ideate/PROJECT.md` that `/ideate` follows in a new project, exist only
until Phase 0 has run, and are deleted in its last commit. Every command that plans follows
`docs/PLANNING.md`. What a project learns about writing stories goes into its own commands —
`/retro` puts it there.

**The stack's skills**, one folder per part of the stack, written for this project by skill
writers: in Phase 0, and whenever a part joins (`docs/STACK_SKILLS.md`, ADR-0014). Claude Code
loads one when work touches its part. What a sprint learns about a part goes into its skill —
`/retro` puts it there, with the sprint's id.

A session notices a new or changed skill by itself — except in a `skills/` folder that did not
exist when the session started, where `/reload-skills` or a new session is needed.

## `launch.json`

How the Claude desktop app starts the inspector in its browser pane: the configuration named
`inspector` runs `tools/inspector/serve.mjs` with Node on the port given there. That port is
this project's own, so two projects' inspectors can run side by side;
`node tools/inspector/serve.mjs` in a terminal uses the same one. Add the product's dev server
as a second configuration if it has one.

## `bearly.json`

Which workflow library made this project, and when. `/bearly-coding:update` reads it before it
changes anything, so a project made by another library is never converted by mistake. Leave it
as it is.

## `skill-drafts/`

Skills you brought from earlier projects, for the skill writers to start from
(`docs/STACK_SKILLS.md`). Git-ignored, and never loaded by Claude Code. The folder is there
only if you named one when the project was made, and can be deleted once Phase 0 is done.

## `worktrees/`

Where Claude Code puts each agent's worktree during a wave, and where a planning session puts
the worktree it writes a sprint, a story or a retro in. Git-ignored; the sprint lead removes a
sprint's worktrees when the sprint lands, and a planning session's once it has merged that
session's branch.
