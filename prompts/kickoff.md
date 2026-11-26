# {{PROJECT_NAME}} — implementation brief

> **How to use this file.** `/bearly-coding:new` copies it into the new project as `KICKOFF.md`.
> `/ideate` replaces every `{{PLACEHOLDER}}` and every _italic prompt in brackets_ and deletes
> this blockquote; `/kickoff`, in a fresh Claude Code session opened in the project directory,
> then carries it out. Everything below is written to be read cold, with no context from the
> ideation chat that produced it.

You are setting up and then building **{{PROJECT_NAME}}**: {{PROJECT_ONE_LINER}}.

This document is the result of an ideation session. The decisions in section 2 are **final** —
do not relitigate them. Where it says _decide_, you decide and write an ADR. Where it says
_ask_, stop and ask me.

Your scope in this session is **Phase 0 only**: repository, environment, architecture skeleton,
the scaffolding for agents, the TruffleHog hooks, secrets handling, the board of sprints and stories,
and a thin end-to-end walking skeleton. The sprints after it are described only so Phase 0
leaves the right seams. Do not build them now.

---

## 1. Product

**Goal.** _[one paragraph: what this is, who uses it, what it must feel like]_

**Core concepts.** _[the two or three nouns the whole system is built from, and the one rule
that relates them — the thing that, if you get it wrong, the design is wrong. `/ideate` has
written them into `docs/GLOSSARY.md`; use those words in every name.]_

**Explicitly out of scope for v1.** _[list. Being explicit here is what stops an agent
building it anyway.]_

---

## 2. Decisions (final)

| Area | Decision | Why (one line) |
| --- | --- | --- |
| Language / runtime | {{LANGUAGE}} | _[why]_ |
| Framework(s) | {{FRAMEWORKS}} | _[why]_ |
| Persistence | {{PERSISTENCE}} | _[why]_ |
| Package manager | {{PACKAGE_MANAGER}} | _[why]_ |
| Test stack | {{TEST_STACK}} | _[why]_ |
| Repo shape | {{REPO_SHAPE}} | _[why]_ |
| Hosting / deploy | {{HOSTING}} | _[why]_ |
| GitHub | Version control only: the repository is stored there and nothing runs there — no Actions, no pull requests, no branch protection, no Dependabot. Tests, verify and the TruffleHog secret scan run locally; autopilot deploys _[or what /ideate settled instead]_ | no Actions minutes, no paid plan, a secret stopped before it is committed (ADR-0009) |
| Agents | Opus at effort high for every story, Sonnet only for mechanical ones; one verifier per wave and two reviewers per sprint, at effort max; a sprint lead with a fresh context for every sprint, and no agent that stops to ask for a permission | quality over cost (ADR-0004), each height checked once (ADR-0007, ADR-0011), contexts kept small (ADR-0008), a run that can last for days (ADR-0013) |
| Parallel agents | at most {{MAX_PARALLEL}} at once, of any kind — _ask_ if this is blank; 1 is the sequential workflow | usage scales with it; the owner's call |
| Delivery | Two ways. On autopilot: one sprint in flight, built in waves of independent stories in their own worktrees, one commit per story; verified per wave, reviewed as a whole, and only then merged into `main`, pushed and deployed. By hand: one story at a time, which I read, commit and push myself | every story is one commit, nothing unreviewed leaves this machine, and what must be read by a person first can be (ADR-0005, ADR-0011, ADR-0012) |

Anything not in this table that you have to choose, you choose and record as an ADR.

---

## 3. Architecture — non-negotiable

`docs/PRIME_DIRECTIVES.md` in the scaffold is the long form of this section, and it wins if the
two ever differ.

1. **Dependencies point inward, never outward, never sideways.**
   `{{LAYER_INTERFACE}}` → `{{LAYER_APPLICATION}}` → `{{LAYER_DOMAIN}}`, and
   `{{LAYER_INFRASTRUCTURE}}` → `{{LAYER_APPLICATION}}` → `{{LAYER_DOMAIN}}`.
   `{{LAYER_INTERFACE}}` may never import `{{LAYER_INFRASTRUCTURE}}`.
2. **The domain layer imports nothing but the standard library.** No web framework, no ORM, no
   client SDK, no serialization library. It is pure data and pure functions, testable with no
   I/O and no fixtures.
3. **The application layer imports only the domain and the ports it defines itself.** Use cases
   receive dependencies through their constructor as port types. They never construct an
   adapter and never read configuration or environment variables.
4. **Every external system sits behind a port.** Database, file store, HTTP client, clock,
   randomness, message bus, third-party SDK. If a use case talks to the outside world, there is
   a port for it.
5. **One composition root.** Exactly one file may import both use cases and concrete adapters,
   in order to wire them together. Name it in `docs/ARCHITECTURE.md`.
6. **One use case, one public entry point.** If you need a second, you have a second use case.
7. **Every port has a memory fake and a shared contract test suite** that every implementation
   of that port must pass, exported as a function taking a factory. The real implementation
   runs it against a local emulator, container or instance — never a cloud project — so
   neither a verify nor a fresh clone needs a credential.
8. **The dependency rule is enforced by an automated check that runs in both verify
   commands** — an architecture test, or a dependency linter, whichever suits {{LANGUAGE}}. It
   also forbids import cycles, imports that resolve to nothing, and dev-only dependencies in
   shipped code, and **a test proves each of its rules fires** on a deliberately illegal
   fixture. If that check fails, the design is wrong, not the check.

**Separation of concerns, concretely.** A vertical slice or feature module owns its own UI, its
own use-case calls and its own types; slices never import each other's internals. Anything two
slices need moves down into the domain or into a shared primitives module, never sideways.

**Extensible by adding, not editing.** Where the same kind of thing gets added repeatedly — a
document type, a report format, an import source — it becomes a build-time registry with one
entry per kind, not a `switch` that grows a case. Adding the tenth kind should be one entry and
one test, touching no existing code. Introduce the registry when the third case appears, not
the first.

**Demo mode.** The composition root has one switch that builds every port from its memory
fake. The end-to-end tests run the composed app that way, so they need no credentials, and
anyone can try the product without an account. Nothing but the composition root reads it.

**YAGNI beats cleverness.** The smallest change that works. Standard library and platform
features before a dependency. No interface with a single implementation unless it is a port
with a memory fake. No abstraction added "for later". Code is concise, clean and readable,
with no limit on a file's length: split a file when it has two jobs. On anything that grows with
the data or the users, favour O(n) or better; anything slower than O(n log n) needs a reason.

---

## 4. Repository layout

Create exactly this, and keep it small. _[Adjust the source tree under the horizontal rule to
{{LANGUAGE}}; leave everything above it alone.]_

```
{{PROJECT_NAME}}/
  CLAUDE.md                  # L0 root context, <= 100 lines
  README.md                  # human quickstart
  KICKOFF.md                 # this file, kept for provenance
  .env.example               # placeholder keys only, never real values
  .gitignore
  .gitattributes             # the glossary and LATER.md merge without conflicts
  .claude/
    settings.json            # tool permissions; Opus at high effort; compaction at 400k; agent teams off
    launch.json              # starts the inspector in the Claude desktop pane
    bearly.json              # which workflow library made this project; its update command reads it
    agents/                  # sprint-lead, and implementer, verifier, reviewer, architect in worktrees;
                             # skill-writer, one per part of the stack, in a session I am in
    skills/                  # my commands (/standup /ideate /feature /fix /refactor /implement
                             # /autopilot /resolve /sprint-review /project-review /retro
                             # /stack-skills /board), and this stack's skills, one per part,
                             # written in Phase 0
  .githooks/
    pre-commit, pre-push     # TruffleHog on every commit and every push; no CI (ADR-0009)
  docs/
    PRIME_DIRECTIVES.md      # non-negotiable rules, read before writing any code
    GLOSSARY.md              # the project's own words, and the ones to avoid
    FEATURES.md              # what the product does today, one entry per capability
    ARCHITECTURE.md          # layers, ports, composition root, how to extend
    PROGRESS.md              # the hand-off: where we are, what waits on the owner
    PLANNING.md              # how work gets onto the board: the interview, the plan branch
    AGENT_WORKFLOW.md        # context levels, sprints, stories, waves, parallel rules, checklists
    ORCHESTRATION.md         # by hand and on autopilot, a sprint move by move, repository setup
    CODING_STANDARDS.md      # what a reviewer checks that no tool can; read by reviewers only
    SECRETS.md               # what is secret, where the copies live
    STACK_SKILLS.md          # what a stack skill answers, and how one gets written
    STORAGE_FORMAT.md        # persisted formats, versioned — only if anything persists
    board/
      BOARD.md               # status and order: the sprints, In wave, Ready, Blocked, Done
      LATER.md               # the parking lot, and what was decided against and why
      sprints/               # every sprint, one folder each
        S-NNN-slug/          # sprint.md (its spec) + a file per story, later its review.md
                             # and its retro.md
        done/                # sprints that are finished and have had their retro
      inbox/                 # single stories I add, waiting to be numbered and filed
      inputs/                # what waits on me, one file each; /resolve takes me through them
      log/                   # phase-0.md, then one file per verified wave
    adr/                     # one file per decision; proposed/ for drafts
  tools/
    inspector/               # my browser view of the board; vendored, outside the gates
    context-report.mjs       # each agent's peak context, for the log; vendored, outside the gates
  ---------------------------------------------------------------
  {{SOURCE_TREE}}
```

Every source directory gets its own `CLAUDE.md` of at most 40 lines: purpose, public API,
invariants, test command, gotchas. Nothing else: Claude Code attaches the whole file to every
file read in that directory. The shape is in `docs/_DIRECTORY_CLAUDE_TEMPLATE.md`.

---

## 5. Repository and visibility

1. `git init`, default branch `main`, conventional-commit messages.
2. Create the GitHub repository as **private**. Private is the default and you do not need to
   ask for it. **If you think this project should be public, ask me — never create a public
   repository, and never flip an existing one to public, without an explicit yes from me.**
3. **Phase 0 lands directly on `main`**, one commit per numbered step in section 9, each with
   `{{VERIFY_COMMAND}}` green. GitHub stores the repository and nothing more is set up there:
   no workflow, no branch protection, no merge settings (ADR-0009). `docs/ORCHESTRATION.md`,
   "Setting up the repository", has the commands.
4. **After Phase 0, work lands sprint by sprint** (directive 26, ADR-0005, ADR-0011): stories
   built on `story/` branches in their own worktrees, one commit each on the local
   `sprint/S-NNN` branch, verified wave by wave — the full verify, then one verifier
   (ADR-0007). When a sprint's last story is in, two reviewers read it as a whole; only then is
   it merged into `main`, pushed and deployed, by its sprint lead. One sprint in flight.
   On autopilot only the sprint lead writes `main`; nobody force-pushes or skips the git
   hooks. That is `/autopilot`. A story built by hand, with `/implement`, is committed and
   pushed by me, and by no session (ADR-0012).

---

## 6. Secrets

1. **No secret ever reaches the repository.** No key, token, password, connection string,
   service-account JSON or `.env` file in a commit, a test fixture, a doc or a commit message.
   `.env` is git-ignored; `.env.example` holds placeholder values only. TruffleHog enforces it
   in `.githooks/`: the pre-commit hook scans what is staged, the pre-push hook every commit a
   push would send, and both refuse to run without `trufflehog` installed.
2. Nothing reads GitHub repository secrets: there is no CI. The deploy reads what it needs from
   the local `.env`, or from the host's own login on this machine. When the project needs a
   secret, ask me to add it and tell me the exact name and where to get the value; never paste
   a real value back into the chat or into a file.
3. **Keeping a secret out of the repository must never mean losing it.** Every secret this
   project uses also gets a copy in a local vault folder outside the repository. The default is
   `{{SECRETS_VAULT}}` — **confirm that path with me once, before you write anything into it**,
   then record the confirmed path in `docs/SECRETS.md` and `docs/PROGRESS.md` so later sessions
   do not have to ask again.
4. `docs/SECRETS.md` keeps an inventory: the name of each secret, what it is for, where it is
   set (local `.env`, hosting provider), and whether a vault copy exists. The
   inventory names secrets. It never contains their values.
5. Public configuration that only identifies the project — a client-side project id, a public
   API key meant to ship in a browser bundle — is **not** a secret and belongs in the
   repository. Say which is which in `docs/SECRETS.md` so nobody has to guess later.

---

## 7. Working method — a board, sprints, and stories that survive a cold start

This project is built from a board, one sprint at a time, by agents that remember nothing, and
**every story must be startable in a brand-new session with no memory of any previous one.**
That constraint drives the whole doc layout:

- `docs/board/sprints/` holds a folder per sprint. A **sprint** is one outcome I asked for, and
  `sprint.md` is its spec; next to it, one file per **story** — goal, what to read, owned
  paths, dependencies, whether it is solo, the model, what to do, the verify command,
  acceptance criteria, done-when — written so an agent that has read nothing else can execute
  it. A story becomes exactly one commit.
- `docs/board/BOARD.md` holds status and order: the sprints, In wave, Ready, Blocked, Backlog,
  Done, and the `max_parallel` limit. `docs/board/log/` is the history — one file per wave.
  `docs/PROGRESS.md` is the hand-off: where we are, what waits on me.
- **A wave** is as many ready stories of the sprint in flight as `max_parallel` allows that are
  provably independent: their dependencies are done, their owned paths do not overlap, and none
  changes a contract (directive 29). Each is built by its own agent in its own git worktree,
  test first, running only `{{VERIFY_FAST}}`; the sprint lead makes one commit of each on the
  local `sprint/S-NNN` branch, runs `{{VERIFY_COMMAND}}` once on the whole, and has one
  verifier read the wave against its stories.
- **A sprint lands whole.** When its last story is in, two reviewers read it in fresh contexts,
  one against `sprint.md` and one against `docs/CODING_STANDARDS.md`; what they say must be
  fixed is fixed. Only then is it merged into `main`, pushed and deployed (ADR-0011). Until
  then nothing of it leaves this machine.
- **Agents never wait on each other.** One that finds an unplanned dependency stops and reports
  it; the sprint lead reschedules. Agents do not message each other: what one finds goes into
  its report, and anything actionable becomes a story.
- **What waits on me is a file.** Whenever building needs something only I can give — a
  decision, a secret to place, an account to set up, a look at a story that failed twice — it
  writes one file in `docs/board/inputs/` that says what, why, and what it holds up, and
  carries on with the rest. `/resolve` takes me through them one by one and writes my answers
  into the files; the builder applies them the next time it starts. A secret never goes into
  such a file or into a session.
- **I can add work at any time**, even while a sprint is being built: `/feature` — by itself,
  or after an `/ideate` — or `/refactor` writes a new sprint folder, `/fix` a single story
  in `docs/board/inbox/`, each on a `plan/` branch of its own, and the sprint lead merges it
  at its next wave planning (`docs/PLANNING.md`). Only whoever is building writes the board,
  the log and `PROGRESS.md`.
- **What a sprint taught is moved to where it is read.** After a sprint has landed, `/retro`
  writes the capability into `docs/FEATURES.md`, new terms into `docs/GLOSSARY.md`, a lasting
  decision into an ADR and a lesson for reviewers into `docs/CODING_STANDARDS.md`, and moves
  the sprint's folder to `docs/board/sprints/done/`.
- **What the stack demands is written down once.** `.claude/skills/` holds one skill per part
  of the stack, written from that part's own documentation by a skill writer (ADR-0014), and
  every agent that touches the part reads it first. `/retro` adds what a sprint taught, and
  `/stack-skills` has one written for a part that joins later.
- **I watch it in the inspector** (`/board`, ADR-0006): a read-only page in `tools/inspector/`
  that shows the board and, from git, where each story of a running wave stands. It is copied
  from the template and is no part of the product.

The rule at the end of every wave: **a fresh session that has read only `CLAUDE.md`,
`docs/PROGRESS.md` and `docs/board/BOARD.md` must be able to plan the next wave or pick up the
next story correctly.** If that would not work, the wave is not done.

Two ways to build, both documented in `docs/ORCHESTRATION.md`, and no mode to set: the command
says which (ADR-0012).

- **By hand** (`/implement`). It asks me which story — or takes the story or sprint I name —
  builds that one itself in my checkout, and stops. It changes nothing in git, decides nothing
  the story did not decide, and builds nothing I did not ask for. I read the diff, commit and
  push. This is the careful way, and the default.
- **On autopilot** (`/autopilot`). The session I type it in is the orchestrator, and it builds
  nothing: it starts one sprint lead after another and keeps the few lines each reports. A
  sprint lead is a sub-agent with a fresh context that takes the top sprint, plans each wave
  from the board, spawns one implementer per story, checks, integrates, verifies and records;
  has the finished sprint reviewed, and lands it (ADR-0013). Nobody stops to ask: what needs
  me is set aside with what it needs written down, a command the settings do not allow is
  refused rather than asked for, a sprint that cannot finish waits while the next is built on
  top of it, and nothing on that branch is pushed until I have unblocked it. Only harm stops a
  run, and a stop stays a stop until I have answered it. With `max_parallel: 1` it is the
  sequential workflow — one agent at a time — and planning sessions can still add sprints
  while it runs. It is made to run for days, and I turn it off by stopping the session.

---

## 8. Phase 0 and the sprints after it

| | Delivers | Done when |
| --- | --- | --- |
| **Phase 0 — Foundation** _(this session)_ | Private repo, a skill for each part of the stack, tooling, architecture skeleton with one port plus memory fake and contract test, the architecture check in both verify tiers, all docs above, the board with every sprint's spec written, a walking skeleton that runs end to end | `{{VERIFY_COMMAND}}` green, the TruffleHog hooks on and the whole history clean, the walking skeleton demonstrably works, nothing runs on GitHub, Ready holds the first sprint's stories |
| S-001 _[name]_ | _[what a user can do once it has landed, and the stories that build it]_ | _[observable outcome]_ |
| S-002 _[name]_ | _[what a user can do once it has landed, and the stories that build it]_ | _[observable outcome]_ |
| Later | _[the parking lot — everything deliberately deferred; it goes into `docs/board/LATER.md`]_ | — |

Each sprint is a folder on the board, in this order; there is no separate plan file.

---

## 9. Phase 0, step by step

Work in this order. Commit after each numbered step.

1. **Ask me** for: the GitHub owner and repository name (default `{{PROJECT_NAME}}`, private),
   the secrets vault path (default `{{SECRETS_VAULT}}`), **how many agents may run in parallel
   in total** (of any kind; 1 is the sequential workflow, and sprints can still be added
   while it runs — suggest 3), **whether autopilot pushes and deploys a finished sprint as soon
   as its review is clean, or only on my yes** (`land: auto` or `land: ask` — suggest `auto`),
   **the parts of the stack that get a skill** — each with its version and the documentation
   site its writer will read; list what you would pick, as `docs/STACK_SKILLS.md` defines a
   part — and anything in section 2 marked _decide_ that you would rather I decided. Ask
   everything in one go, not one question at a time. My answers go into `max_parallel` and
   `land` in `docs/board/BOARD.md`.
2. Check that `trufflehog --version` runs — if it does not, stop and ask me to install it
   (`docs/SECRETS.md` says how). Then `git init`, `git config core.hooksPath .githooks`,
   `git add --chmod=+x .githooks/pre-commit .githooks/pre-push` — on macOS and Linux git skips
   a hook that is not committed as executable — the first commit, and
   `gh repo create --private --source . --push`.
3. The stack's skills, then the tooling. Have a skill written for each part of the stack I
   agreed to in step 1, as "Having skills written" in `docs/STACK_SKILLS.md` says: one skill
   writer per part, side by side, at most `max_parallel` at once, each writing
   `.claude/skills/<part>/SKILL.md` (ADR-0014). In the default and accept-edits modes, Claude
   Code will ask me before a writer reads a site and before a skill is written; in auto mode a
   background check decides, and in bypass mode nothing asks. Never work around a refusal,
   whoever made it. Check each skill, show me one line per skill with what is not yet confirmed, and
   commit them. Then read them: the tooling is set up the way they say. Then:
   {{PACKAGE_MANAGER}} set to save exact versions, with an allowlist for install
   scripts and the runtime version pinned in the repository and supplied by the toolchain; the
   strictest type-checker settings the stack has; a linter, with no rule on file length
   (ADR-0010); a formatter; the test runner; the dependency check with its
   hygiene rules. Leave `tools/inspector/` and `tools/context-report.mjs` out of every one of
   them — linter, formatter, unused-code check, dependency check: both are vendored from the
   template and no part of the product (ADR-0006, ADR-0008), and an exclusion written in now is
   not a gate weakened later. Start the
   ledger in `docs/adr/ADR-0003-dependencies.md`. Wire two gates:
   `{{VERIFY_FAST}}` — typecheck, lint, the dependency check and unit tests, with no ports,
   servers, containers or emulators, so several agents can run it at once — and
   `{{VERIFY_COMMAND}}`, which runs **everything**: the fast verify, then the contract suites
   against local emulators, the build and the end-to-end tests. A sprint lead will run it
   once per wave, so keep it as fast as it can honestly be.
4. The architecture skeleton: the domain types the product actually needs, one real port with
   its memory fake and its shared contract suite (run against the real implementation on a
   local emulator or container), one use case, the composition root with its demo switch, and
   the architecture test that proves every rule of the dependency check fires.
5. The walking skeleton: the thinnest path that exercises every layer end to end and is visible
   from outside. Its end-to-end test runs the composed app in demo mode.
6. The secret scan and the deploy, both local (ADR-0009). Scan the whole history once:
   `sh .githooks/pre-push --all`. Deploy only if section 2 says
   so — and then as one `{{DEPLOY_COMMAND}}` that builds what it deploys and ships the
   configuration the code needs with it, run by the sprint lead from `main` after each sprint
   lands (move 10), allowed in `.claude/settings.json`. If section 2 put more on
   GitHub than version control, apply "Using more of GitHub" in `docs/ORCHESTRATION.md` and
   write its ADR. Otherwise the project has no `.github/` folder at all.
7. Docs: everything in section 4, and the commands in `.claude/skills/` with this project's
   name and both verify commands filled in. The allow-list in `.claude/settings.json`, with
   the package manager, the deploy command and whatever else this stack runs: an agent on
   autopilot never asks, so what is not on that list it is refused (ADR-0013). Show me the
   list before you commit it. The board: a sprint folder for every sprint in
   section 8, in that order, each `sprint.md` written as its spec, in the glossary's words;
   stories written in full for the first sprint, cut as slices and designed for side-by-side
   work — each contract change first as a Solo story, then stories with disjoint owned paths,
   and the sprint's one end-to-end test named on the story that completes its main path; later
   sprints get their stories from a breakdown story or a planning session. `BOARD.md` with the
   sprints in order, Ready, a **Now** line, and `max_parallel` and `land` set to my answers;
   `docs/board/log/phase-0.md` filled in; `docs/board/LATER.md` with section 8's parking lot;
   one input in `docs/board/inputs/` for each thing in this brief still marked _ask_ and for
   each thing only I can do before the first sprint can finish, with its line in `PROGRESS.md`;
   `docs/GLOSSARY.md` with section 1's core concepts and every term you had to settle;
   `docs/FEATURES.md` with one entry, the walking skeleton; `docs/CODING_STANDARDS.md` with its
   placeholder filled in and nothing added — and no bracketed prompt left in any of these: a
   list that has nothing in it yet says "Nothing yet."; `PROGRESS.md`; ADRs for the section 2
   decisions and for anything you decided, with ADR-0006 naming each check the inspector's
   folder and the context report were left out of; `STORAGE_FORMAT.md` with a golden corpus
   test if anything persists, deleted otherwise.
8. Push, confirm the repository is private, and write the hand-off in `PROGRESS.md`. In the
   last commit, delete `.claude/skills/kickoff/` and `.claude/skills/ideate/PROJECT.md`: they
   have done their job, and running `/kickoff` again would build over a living project.
   `/ideate` itself stays: from now on it thinks one sprint through at a time.

---

## 10. Constraints on you, the implementer

- Lazy in the senior-engineer sense: the smallest diff that works, platform features before
  dependencies, no scaffolding for a future that is not in section 8.
- Every dependency you add gets a row in the ledger of `docs/adr/ADR-0003-dependencies.md`
  saying why nothing already installed sufficed.
- Do not add without asking: a state-management library, a DI container, an ORM, GraphQL, a CSS
  framework beyond the one in section 2, i18n, analytics, or an error-tracking SaaS.
- Tests are part of the step, not a follow-up, written before the code they test, and they go
  where the logic lives (directive 14): the rules of the domain and the use cases, each port's
  contract suite, and one end-to-end test — the walking skeleton's. None for wiring, views or
  configuration.
- Update the context files inside the step that changed them: directory `CLAUDE.md`, an ADR for
  a decision that is hard to reverse, surprising and a real trade-off. In Phase 0 you are the
  one building, so the board, the log and `PROGRESS.md` are yours to write.
- Token hygiene: terse test reporters, no log dumps in commit messages, never scan the whole
  repository — read down the context levels and stop when you know enough. Find code with grep,
  then read only the lines you need; never print a whole file of more than about 300 lines.
- Do not fabricate external state. If a step needs me (creating a cloud project, pasting a
  secret, approving a public repository, a paid plan), **stop and ask with exact instructions**,
  and record the block in `PROGRESS.md`.

---

## 11. When you finish

Report: what was built, what was verified and with which command output, what was skipped and
why, what you need from me, the first wave of the first sprint as you would plan it (which
stories, and why they are independent), and the two commands that build it in a fresh
session — `/autopilot` to let it run, or `/implement` to build the first story with me — with
`/board` to watch it, `/standup` to ask where things stand, and `/resolve` for whatever waits
on me.
