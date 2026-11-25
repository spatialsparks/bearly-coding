# {{PROJECT_NAME}}

{{PROJECT_ONE_LINER}}

## Quickstart

```bash
git config core.hooksPath .githooks
{{INSTALL_COMMAND}}
{{DEV_COMMAND}}
```

The first line, once per clone, makes TruffleHog check every commit and push; without
`trufflehog` installed both are refused (`docs/SECRETS.md`). Copy `.env.example` to `.env` and
fill in the real values — they are in the vault named in `docs/SECRETS.md`. Never commit `.env`.

## Commands

| Command | Does |
| --- | --- |
| `{{DEV_COMMAND}}` | {{DEV_DESC}} |
| `{{VERIFY_FAST}}` | Typecheck, lint, architecture check, unit tests — safe to run in parallel |
| `{{VERIFY_COMMAND}}` | The fast verify, then contract suites, build and end-to-end — run once per wave |
| `{{TEST_COMMAND}}` | Unit tests only |
| `{{LINT_COMMAND}}` | Lint and format |

## How this project is built

By agents, one sprint at a time, from a board. A **sprint** is one outcome that was asked for:
a folder with its spec and its **stories**. Every story is a file written so an agent with no
memory of anything else can do it, and becomes one commit. There are two ways to build one.
**By hand**, `/implement` asks which story, builds that one in your checkout, and stops: you
read it, commit it and push it. **On autopilot**, `/autopilot` works through the board by
itself, for days if it has to: it gives every sprint a sprint lead of its own, an agent with a
fresh context, which builds the sprint in
**waves** — as many independent stories as `max_parallel` allows, each by its own agent in its
own git worktree, test first — runs the full verify once per wave and has one verifier read it.
When the last story is in, two reviewers read the whole sprint, one against its spec and one
against the project's standards; what they say must be fixed is fixed. Only then is the sprint
merged into `main`, pushed and deployed. Everything runs on this machine: the tests, the
verify, and TruffleHog on every commit and push. GitHub only stores the repository.

| Where things are | |
| --- | --- |
| `CLAUDE.md` | Root context — read first, every session |
| `docs/PRIME_DIRECTIVES.md` | The non-negotiable rules |
| `docs/GLOSSARY.md` | The project's own words, and the ones to avoid |
| `docs/FEATURES.md` | What the product does today |
| `docs/ARCHITECTURE.md` | Layers, ports, composition root |
| `docs/board/BOARD.md` | Every sprint and story, and what is ready, running, blocked or done |
| `docs/board/sprints/` | One folder per sprint, `S-NNN-…/`: its spec, a file per story, its review and its retro. Finished sprints are in `done/` in there |
| `docs/board/log/` | What each wave did, a file each — read the newest to see how it is going |
| `docs/board/inputs/` | What waits on you, one file each — a decision, a secret to place, something to set up |
| `docs/board/LATER.md` | What is parked, and what was decided against |
| `docs/PROGRESS.md` | Where it stands right now, and what is waiting on the owner |
| `docs/adr/` | Why each decision was made |
| `.claude/skills/` | What this project knows about each part of its stack, one skill each (`docs/STACK_SKILLS.md`), next to the commands below |
| `tools/context-report.mjs` | How large each agent's context grew; the log keeps its lines. Copied from the template, never edited here |

Everything is a command, typed in a fresh Claude Code session opened here — or after `/clear`,
so that each run starts with a context of its own (ADR-0008). Each takes what you would
otherwise explain as its argument, and asks if you give it none.

| Command | Does |
| --- | --- |
| `/standup` | Says where things stand, and which command to type next |
| `/ideate <idea>` | Thinks an idea through with you, in rounds of questions; writes down the terms and decisions |
| `/feature <idea>` | Adds a sprint — its spec and its stories. Asks a few questions first, or none in the session that just ideated |
| `/fix <what>` | Adds one story — a bug, reproduced first, or a small change |
| `/refactor <what>` | Puts a refactoring on the board: tests that hold the behaviour first |
| `/implement` | Builds one story by hand: asks which, builds it, waits for your review and commit — or `/implement S-012.3`, `/implement S-012` |
| `/autopilot` | Builds what is ready by itself, sprint after sprint, until nothing can move — or `/autopilot 1 wave`, `/autopilot S-012` |
| `/resolve` | Takes you through what waits on you, one input at a time, and writes your answers down |
| `/sprint-review` | Two reviewers read a sprint, a range of commits or uncommitted work: Spec and Standards |
| `/project-review` | Surveys the whole codebase for what is worth improving |
| `/retro` | After a sprint has landed: moves what it taught to where it will be read |
| `/stack-skills` | Has the skill for a part of the stack written or refreshed, from that part's own documentation — or `/stack-skills postgres` |
| `/board` | Opens the inspector |

Every command that plans — from `/ideate` to `/retro` — is safe at any time, even while a
sprint is being built: it writes on a branch of its own, `/autopilot` picks it up at its next
wave, and `/implement` offers to bring it in. `docs/PLANNING.md` and `docs/ORCHESTRATION.md`
explain the whole protocol.

## See the board

Type `/board`, or run `node tools/inspector/serve.mjs` in a terminal. A page opens with the board as
four columns — waiting, in progress, in review, done — what is waiting on you, and every
context file rendered and linked. It only reads, it answers this machine only, and it refreshes
itself while a wave runs. `tools/inspector/README.md` has the details.

## Contributing rules that matter

- `{{VERIFY_COMMAND}}` must be green before a sprint lands. Never make it green by weakening it.
- One sprint is in flight, one commit per story. On autopilot it reaches `main`, and is
  pushed, only when it is reviewed and finished, and only the sprint lead writes `main`. By
  hand, no session commits anything: the owner does.
- Dependencies point inward. `{{ARCHITECTURE_CHECK}}` enforces it in every verify.
- Secrets never reach this repository. See `docs/SECRETS.md`.
- This repository is **private**. Nothing becomes public without the owner saying so.
