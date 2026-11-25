# How bearly-coding works

The workflow encodes four things: **clean architecture with enforced boundaries**, **a private
repository that only stores the code, with every check and every secret on your machine**, **a
board of sprints and stories that each survive a cold start**, and **two ways to build from
it** — one story at a time by hand, which you read and commit yourself, or on autopilot, for
days if it has to. And four things make it comfortable: **a command for every step**, so
nothing is pasted, **a conversation that plans**, **skills your project writes for its own
stack**, and **a page in the browser** that shows the board while it moves.

Three words carry it, and they are the folders and files on disk:

| Word | What it is | On disk |
| --- | --- | --- |
| **Sprint** `S-012` | One outcome you asked for, planned in one sitting: its spec, and the stories that build it | A folder, `docs/board/sprints/S-012-share-links/`, with `sprint.md` |
| **Story** `S-012.3` | One piece of a sprint: one agent, one fresh context, one commit | A file in that folder |
| **Wave** | The stories built at once: the ready ones that are provably independent | A file in `docs/board/log/`, once it is verified |

---

## What is in this repository

```
bearly-coding/
  .claude-plugin/        plugin.json and marketplace.json: what Claude Code installs
  skills/                the plugin's two commands, /bearly-coding:new and /bearly-coding:update
  scripts/
    new-project.mjs      copies the scaffold and fills in the easy placeholders
    new-workspace.mjs    a light workspace, or a folder for an idea
  workspaces/            what that script copies: light/ and ideate/
  prompts/
    kickoff.md           the brief: copied into a new project as KICKOFF.md
    upgrade-project.md   moves an existing project onto the board, sprints and waves
    update-project.md    brings a project already on the board up to this template
  tests/                 the tools' tests, and checks that the template agrees with itself
  scaffold/              the files a new project starts with
    CLAUDE.md            root context, at most 100 lines
    README.md            human quickstart
    .gitignore           secrets-safe baseline, plus the agents' worktrees
    .env.example         placeholder keys only
    .gitattributes       lets two planning sessions add to the glossary without a conflict
    .claude/
      settings.json      permissions, the denies that back up the rules, the model and effort,
                         early compaction and a reminder after one
      launch.json        starts the inspector in the Claude desktop pane
      bearly.json        which workflow library made the project
      agents/            sprint-lead, implementer, verifier, reviewer, architect, skill-writer
      skills/            the commands: /standup /ideate /feature /fix /refactor /implement
                         /autopilot /resolve /sprint-review /project-review /retro
                         /stack-skills /board, and /kickoff until Phase 0 has run
    .githooks/           TruffleHog on every commit and push
    docs/
      PRIME_DIRECTIVES.md  the non-negotiable rules
      GLOSSARY.md          the project's own words, and the ones to avoid
      FEATURES.md          what the product does today, one entry per capability
      ARCHITECTURE.md      layers, ports, composition root, demo mode, how to extend
      PROGRESS.md          the hand-off: where things are, what waits on the owner
      PLANNING.md          how work gets onto the board: the interview, the plan branch
      AGENT_WORKFLOW.md    sprints, stories, waves, the definition of ready, parallel rules
      ORCHESTRATION.md     by hand and on autopilot, a sprint move by move, repository setup
      STACK_SKILLS.md      what a stack skill answers, and how one gets written
      CODING_STANDARDS.md  what a reviewer checks that no tool can
      SECRETS.md           what is secret, where the copies live
      STORAGE_FORMAT.md    the persisted formats, versioned
      board/               BOARD.md, LATER.md, the templates, inbox/, inputs/, log/, sprints/
      adr/                 one record per decision behind the workflow, ADR-0001 to ADR-0014
    tools/
      inspector/           the browser view of the board and the context files
      context-report.mjs   each agent's peak context since a wave began, for its log
```

---

## How to use it

Every step is a command typed into a Claude Code session, in the terminal or the desktop app.
A command takes what you would otherwise explain as its argument, and asks if you give it none.

### 1. Start: `/bearly-coding:new` asks what you are doing

It first asks which of three kinds of work this is, and sets up only what that kind needs:

| Answer | What it sets up | GitHub |
| --- | --- | --- |
| **Build software** — an app, a website, an API, a game, code that generates something | The project described below: the scaffold, `/ideate` and `/kickoff`, the board, sprints and waves | Version control only |
| **Tool or content work** — 3D assets, data work, scripts | A light workspace in a folder you name: git, the TruffleHog hooks, a short `CLAUDE.md`. No board, no architecture rules, no verify | Only if you say so, and then version control only |
| **Just ideate** | A folder at the path you give, with a `CLAUDE.md` and `sources/`. The result is a `brief.md` that a later project starts from | None, and no git |

For software, `/bearly-coding:new my-thing` copies `scaffold/` into a new folder, drops in
`KICKOFF.md`, fills in the project's name, path, date and the inspector's port, and prints the
placeholders that still need real answers. The first time, it asks where your projects go and
where copies of secrets go, and remembers both. With no name, it takes the folder the session
is open in, so a folder you made first can become the project. A folder is filled only while
it is empty; one that holds anything is refused.

### 2. Ideate

Open a session **in the new project** and type `/ideate` followed by your raw idea. It
interviews you in rounds — every question that can be asked now, numbered, each with the answer
it would recommend — looks up what it can find out itself, argues with the weak parts, and
writes the project's own words into `docs/GLOSSARY.md` as they settle. In a new project it ends
by filling in `KICKOFF.md`, with the sprints and their stories. No code is written.

### 3. Kick off

Open a fresh session in the project and type `/kickoff`. Phase 0 asks you a few things in one
go — **how many agents may run in parallel**, whether a finished sprint lands by itself or on
your yes, and which parts of the stack get a skill — and then builds the repository, the
stack's skills in `.claude/skills/`, the tooling with both verify tiers, the architecture and
walking skeletons, the TruffleHog hooks, and the board: every sprint's spec written, the first
sprint's stories as files. It lands directly on `main`, sets nothing up on GitHub but the
private repository itself, and deletes `/kickoff`, which has done its job. `/ideate` stays.

### 4. Build — by hand, or on autopilot

Two commands, and no mode to set: the one you type says what happens.

**`/implement` — one story, by hand.** Type it alone and it shows the sprint in progress and
asks which story:

```text
S-012 — Share links (2 of 5 stories done)
  S-012.3  The dialog copies the link     ready
  S-012.4  A link can expire              ready
  S-012.5  An expired link says so        waits for S-012.3, S-012.4

Which story?   [S-012.3]  [S-012.4]  [The whole sprint]  [Other: any story or sprint]
```

Or name it: `/implement S-012.3`, `/implement S-012`. It builds that one story itself, in your
checkout, on the branch you have checked out — test first, inside the story's owned paths, both
verifies green — records it on the board, and stops with a report: what changed, each
acceptance criterion, a commit message, and what it noticed and left alone. **It changes
nothing in git**: you read the diff, you commit, you push. It decides nothing the story did not
decide — before a new dependency, a change to a contract, a file outside the owned paths, or a
choice between two designs, it stops and asks — and it builds nothing you did not ask for.
Given a sprint, it still builds one story at a time and waits for your word after each. This is
the careful way, and the plain name is the careful one on purpose.

**`/autopilot` — the board, by itself.** Until nothing can move, or with a stop point:
`/autopilot 1 wave`, `/autopilot 2 sprints`, `/autopilot S-012`.

The session you type it in is the orchestrator, and it builds nothing: it starts one **sprint
lead** after another and keeps the few lines each reports. A sprint lead is an agent with a
fresh context that takes the top sprint on the board and cuts a local `sprint/S-012` branch. It
builds the sprint in waves: as many of its ready stories as `max_parallel` allows that are
provably independent, one implementer per story, each in its own git worktree, test first. It
checks each result, makes **one commit of each story**, runs the full verify once on the wave,
and has one verifier read the wave against its stories. When the sprint's last story is in,
**two reviewers read the whole sprint** in fresh contexts, side by side — one against its spec,
one against the project's standards — and what they say must be fixed is fixed. Only then is
the sprint merged into `main`, pushed and deployed; until then nothing of it leaves the
machine. Then the lead reports, and the next sprint gets a fresh one.

**It is made to run for days.** No sprint is built in a context that has seen another, and the
orchestrator's own context grows by a few lines per sprint. When your plan's usage limit is
reached, Claude Code waits and goes on by itself after the reset. To turn autopilot off, stop
the session: nothing is scheduled, and nothing starts by itself later. A reboot or a closed app
ends a run; type `/autopilot` again and it carries on from the board. Keep the computer awake.

**Nobody stops to ask.** A story that needs you — a secret, an account, a decision — or that
failed twice is set aside, with what it needs written into a file of its own in
`docs/board/inputs/`, and everything that does not depend on it goes on. A command the
project's settings do not allow is refused at once instead of asked for: the agent does
without it, or its story is set aside like any other. A sprint that cannot finish waits, and
the next sprint is built on top of it, on the same branch; nothing on that branch is pushed
until you have unblocked it, and then it all lands. A deploy that fails twice holds every
further landing, and building goes on. The run ends when nothing can move, with one list of
what waits on you.

**It stops at once only where going on could do harm**: a secret found by TruffleHog, anything
that would become public. Such a stop stays a stop: no run starts again until you have
answered it. With `land: ask` on the board it also waits for your yes before each push.

Run it in a session in Manual mode, the default, or in Auto mode — not in "Accept edits", which
still asks before a command. With `max_parallel: 1` it is the sequential workflow: one agent at
a time. The two ways never run at once: `/implement` stops if a wave is being built, and
`/autopilot` stops if the working tree holds changes that are not committed.

### 5. Give it what it waits for

Whenever building needs something only you can give, it writes one file in
`docs/board/inputs/` and carries on with the rest:

| Kind | For example | Your answer |
| --- | --- | --- |
| A decision | A choice the story left open; how to settle a finding that survived two fixes | The option, or another |
| A secret | An API key, a token | "Done" — you put the value into `.env` and the vault yourself; it never goes into the file or the session |
| Something to set up | A cloud project, a paid plan, a repository setting; a command the settings refused; a deploy that failed twice | "Done", with what is not secret: a project id, an address |
| A look | A story that failed twice | A hint, "I will build it by hand", or "take it out of the sprint" |
| An approval | Landing a sprint when the board says `land: ask` | Yes or no |
| A stop | TruffleHog found a secret; the board itself is wrong | What you did about it. Until then no run starts |

Each file is written for you coming back days later: what is needed, why an agent could not
settle it, what it holds up, the options with the one the builder would take, or the exact
steps. `/resolve` takes you through the open ones, one at a time, the one that holds up the
most first. It writes your answer into the file and changes nothing else. Whoever builds next
applies the answers when it starts, and a running `/autopilot` picks them up at its next wave.

### 6. Add work whenever you like

| Command | Adds |
| --- | --- |
| `/ideate <idea>` | Nothing yet: it thinks the idea through with you, and writes the terms and decisions down |
| `/feature <idea>` | A sprint with its spec and its stories — after a short interview, or with none in the session that just ideated |
| `/fix <what>` | One story — a bug, reproduced first, with the command that fails; or a small change |
| `/refactor <what>` | A refactoring: the tests that hold the behaviour first, then the moves |
| `/stack-skills <part>` | The skill for a part of the stack, new or refreshed |

Each is committed on a `plan/` branch of its own. That is safe while a sprint is being built: a
sprint is a new folder, a single story is a new file in `docs/board/inbox/`, both written in a
worktree of the planning session's own, and autopilot merges them into `main` at its next wave
planning. When you build by hand, `/implement` names the plans that wait and brings them in on
your yes.

### 7. Look back, and look around

| Command | Does |
| --- | --- |
| `/retro` | After a sprint has landed: moves what it taught to where the next session reads it — the capability into `docs/FEATURES.md`, new terms into the glossary, a lasting decision into an ADR, a lesson for reviewers into `docs/CODING_STANDARDS.md`, a lesson about the stack into its skill — proposes a check for every mistake a tool could have caught, and moves the sprint's folder to `docs/board/sprints/done/` |
| `/sprint-review` | The two reviewers on demand: on the sprint in flight, one that has landed, a range of commits or uncommitted work. The findings you pick become stories |
| `/project-review` | A survey of the whole codebase, or the part that changes most: where the design fights the work, where tests prove nothing, where the documents have gone stale |
| `/standup` | Where things stand, and the one command to type next |

### 8. Watch it

`/board`, or `node tools/inspector/serve.mjs` in a terminal. A page opens with the board as
four columns — waiting, in progress, in review, done — what is waiting on you, the sprints, the
latest waves, and every context file rendered with its ids, ADRs and paths as links. It
refreshes itself while a wave runs.

### 9. Bring an existing project along

Open a session **in the existing project** and type `/bearly-coding:update`. It picks the right
prompt:

- **Not on the board yet** — [`prompts/upgrade-project.md`](../prompts/upgrade-project.md). It
  surveys the project's documents, asks you the same questions Phase 0 would, and shows you a
  migration map — every planning, state, history and rules file, where it goes, and how —
  before writing anything. What is built becomes the feature list, what is still to build
  becomes sprints with their stories, the project's words become the glossary, append-only
  history is archived unchanged, and directive and ADR numbers stay stable.
- **Already on the board** — [`prompts/update-project.md`](../prompts/update-project.md). It
  compares the project's workflow files with the template's and brings over what the template
  has gained since. The project's own rules win, the stack's skills are never touched, and it
  goes through the allow-list with you. Run it again whenever the template changes: it skips
  what the project already has.

Either way it commits on one branch for you to review, merges it into `main` once you say yes,
and changes no source code beyond what the prompt names.

---

## The four things it encodes

### Clean architecture, enforced by a test

Dependencies point inward. The domain layer imports nothing but the standard library. Every
external system sits behind a port, every port has a memory fake and a contract suite every
implementation must pass, and exactly one composition-root file may import both use cases and
concrete adapters.

The rule is enforced by a check that runs in every verify — not by convention, because a
convention does not survive a fresh context. If the check fails, the design is wrong, not the
check. And the check proves itself: a test writes one illegal module per rule and asserts the
rule fires, because a rule with a typo in its pattern matches nothing and passes forever.

### Private by default, secrets that stay put

A new repository is created **private**, and nothing becomes public without an explicit yes.
No secret ever reaches the repository: not in a commit, a test fixture, a document or a commit
message. TruffleHog checks what is staged before every commit and every commit before it is
pushed, in the project's git hooks, and refuses both when it is not installed. The hooks hand
it the files themselves: its own git scan sees nothing of `git commit -a`, and under Git for
Windows it stops without a word at a `.pdf`, `.docx` or `.rtf`. Agents' worktrees get no
secrets.

Because keeping a secret out of git must never mean losing it, every secret also gets a copy in
a vault folder outside the repository, confirmed with you once and then recorded in
`docs/SECRETS.md` so later sessions do not have to ask again.

### GitHub stores the repository, and nothing else

No GitHub Actions, no pull requests, no branch protection, no Dependabot — unless a project's
`/ideate` decides otherwise, in an ADR. Every test, every verify and every secret scan runs on
your machine; a sprint lead merges each finished sprint into `main`, pushes it and deploys it
from there. That costs no Actions minutes and no paid plan, and a secret is stopped before it
is committed rather than found after it was pushed. What it gives up: nothing on the server
enforces anything. The hooks and the deny list are client-side.

### A board of stories that survive a cold start

Every story is a file written so an agent that remembers nothing can do it: goal, what to read,
owned paths, dependencies, whether it changes a contract, the verify command, acceptance
criteria. A sprint's folder groups its stories, and its `sprint.md` is their spec: why it is
wanted, what it delivers, its behaviour, its rules, what was decided, what it is not.
`BOARD.md` holds status and order; `docs/board/log/` holds the history, a file per wave;
`PROGRESS.md` is the hand-off.

The rule at the end of every wave: a fresh session that has read only `CLAUDE.md`,
`PROGRESS.md` and `BOARD.md` must be able to plan the next wave correctly. If it could not,
the wave is not done.

A sprint's folder is its whole record — spec, stories, the reviewers' `review.md`, the
`retro.md` — and no file grows without end: a story is a file, a wave is a file, a finished
sprint moves to `sprints/done/`.

### One sprint at a time, in waves of agents that cannot collide

This is how `/autopilot` builds; `/implement` builds one story in your own checkout and needs
none of it. A wave takes as many ready stories of the sprint in flight as `max_parallel`
allows, but only stories that are **provably independent**: every dependency done, owned paths
that do not overlap — shared files like the lockfile or the composition root included — and no
contract change, which always runs alone. The sprint lead computes this; it does not judge it.
Free slots go to ready stories of the standing maintenance sprint, a regression first of all.

Each agent works in its own git worktree and runs only the fast verify — no ports, servers or
emulators, so any number can run at once. The sprint lead alone runs the full verify, once per
wave, on the sprint branch with every story committed: two stories that pass alone and fail
together are caught there, and the one that broke it is fixed or backed out. Agents never wait
on each other: one that finds an unplanned dependency stops and reports it. Only the sprint
lead writes the board, the log and `PROGRESS.md`, so they stay true.

**A story is one commit, and a sprint is one merge.** Each story's branch becomes one commit
on the sprint branch, with the story's id closing its subject —
`feat: the dialog copies the link (S-012.3)` — so a story can be read, reverted or sent ahead
by itself. The sprint reaches `main` as one merge commit with its stories behind it:
`git log --first-parent` reads sprint by sprint, `git log` story by story.

**Nothing unreviewed leaves the machine.** The sprint branch is local. When the last story is
in, two reviewers read the whole sprint in fresh contexts, each along one axis that never mixes
with the other: **Spec** — does it do what `sprint.md` asked, nothing missing, nothing extra —
and **Standards** — is it written the way this project writes. A sprint can pass one and fail
the other, and one mixed list would hide which. What they class as *must fix* becomes stories
of the sprint and is read again; what is *for the owner* waits in the sprint's `review.md`.
Then the merge, the push, the deploy. What this costs: with one sprint in flight, agents are
only as parallel as the sprint was cut, a fix waits for its sprint unless you send it ahead,
and while a sprint waits on you, what was built on top of it waits on your machine too.

**The careful way is the default.** The command with the plain name, `/implement`, commits
nothing; working through the board alone takes the explicit word, `/autopilot`. There is no
mode on the board to remember. A repository where no session may ever commit gets that from
the harness as well: `.claude/README.md` in the project says which permissions to move from
`allow` to `deny` — a change you make yourself, because a session does not set its own
permissions.

**The agents never ask for a permission.** What the settings do not allow is refused, and
costs one story instead of the run. That makes the allow-list in `.claude/settings.json` the
whole of what an agent on autopilot may do, so Phase 0 shows it to you before committing it,
and the update prompt goes through it with you.

**Quality over cost.** The agents run on Opus for every story, Sonnet only for mechanical work
with no judgement in it; effort `high`, and `max` for the one verifier per wave and the two
reviewers per sprint. The project's settings start every session on Opus at high effort, so
nobody has to remember to. Usage scales with `max_parallel`: keep it modest.

**Checked at two heights, each once.** An implementer runs the fast verify; the full verify
runs once per wave; one fresh-context verifier reads the wave against its stories; two
reviewers read the finished sprint as a whole. Tests are written where the logic lives — the
domain, the use cases, each port's contract, one end-to-end path per sprint — before the code
they test, and not for wiring or views.

**Standards are the reviewer's, not the implementer's.** `docs/CODING_STANDARDS.md` is read by
whoever reviews, never by an implementer, whose context is for its story. A mistake a tool
could catch becomes a check — a lint rule, an architecture rule with its proof — and never a
sentence in that file; `/retro` is what decides which.

**Contexts kept small.** A large context window is no reason to fill it. Every sprint is built
by a sprint lead with a fresh context; a context that fills all the same is compacted early,
and a hook then tells the session to read its rules again. Agents find code with grep and read
only the lines they need, and a story's **Read** list names the functions, not just the files.
`tools/context-report.mjs` measures every agent from its transcript, and each wave's log file
keeps the numbers.

---

## What makes it comfortable

### A command for every step

Each command is a skill in the project's `.claude/skills/`. It is marked so that only you can
start it: an agent never runs one, and none is loaded into an agent's context. What a project
learns about running itself goes into its own commands — which is why the update prompt keeps
a project's own rules rather than overwriting them, and why `/retro` writes a lesson about how
stories are written into the commands that write them. `/standup` is the one to type when you
do not know which is next.

### A conversation that plans

`/ideate` does not fill in a form. It treats an idea as a tree of decisions and asks it out in
rounds: every question that can be asked now, numbered, hardest first, each with the answer it
would recommend. What it can look up — in the code, the feature list, an ADR, a tool's
documentation — it looks up; what it asks you is only what is yours to decide. It checks what
you say against the code and against an awkward case, and says so when an idea was already
decided against (`docs/board/LATER.md`).

While it talks it keeps `docs/GLOSSARY.md`: the project's own words, each with what it **is**
and the words it replaces. Every session and every agent reads it, so a later conversation
says "the share link" instead of twenty words, and code, tests and commits are named the same
way. It proposes an ADR only for a decision that is hard to reverse, surprising without its
context, and a real trade-off. `/feature`, typed in the same session, then turns the
conversation into the sprint's spec and its stories, cut as slices: each a narrow but complete
path, so something can be seen when it is in.

### Skills your project writes for its own stack

An agent that starts cold needs to know how this project uses each part of its stack: where a
framework sits in the layers, which tool enforces the dependency rule, what the fast verify
may start, what costs an hour. That is a stack skill, one per part, in `.claude/skills/`, and
Claude Code loads it when work touches the part.

No library of skills ships with the template. `/kickoff` starts one **skill writer** per part,
side by side. Each has a fresh context, reads that part's own documentation for the version
the project uses, and writes one skill to a fixed outline of seven questions
(`scaffold/docs/STACK_SKILLS.md`). Every rule names the page it came from, and what a writer
could not confirm is listed at the end as not yet confirmed. `/retro` settles those lines as
sprints prove them, and adds what a sprint taught. `/stack-skills` has a skill written for a
part that joins later, or refreshed for a new major version.

A skill is an instruction every later agent follows, so writing one is never left to
autopilot. A skill writer runs only in a session you are in, has no shell, and Claude Code
asks you before it reads a site and before it writes a skill. If you keep a folder of skills
from earlier projects, `/bearly-coding:new` copies it into the new project as drafts, and each
writer starts from the draft for its part and checks it against the documentation.

### The inspector

`tools/inspector/` in every project: a page of plain HTML, CSS and JavaScript, and a small
Node server that hands it the project's context files and git state. No dependency, no build
step, nothing loaded from the network.

- **It only reads.** The server answers GET, to this machine only, and serves a file only if
  git can see it and it is a context file — so `.env` cannot be reached. The board keeps its
  one writer.
- **The board says what is in a wave; git says where each story stands.** The board is only
  rewritten when a wave is planned and when it is recorded. In between, a locked worktree is an
  agent at work, a commit on the sprint branch that closes with a story's id means the story is
  in, and a locked detached worktree at the sprint branch's tip is the verifier or a reviewer.
- **It reads the board by name, not by position** — sections by their heading, columns by their
  header — so a board a sprint lead has reworded still shows what it has.
- **It is the same in every project**, copied and never edited there, and left out of the
  project's linter, formatter and architecture check for that reason. It is changed here, with
  its tests, and `/bearly-coding:update` copies it again.

To look at a project that has no copy of its own yet, from this repository's folder:

```sh
node scaffold/tools/inspector/serve.mjs --project ../some-project
```

---

## Placeholders

`new-project.mjs` fills in the first five. The rest are decisions, and come out of the
ideation and the kickoff.

| Placeholder | What it is |
| --- | --- |
| `{{PROJECT_NAME}}` | Repository and directory name |
| `{{PROJECT_PATH}}` | Absolute local path |
| `{{SECRETS_VAULT}}` | The project's folder in your vault, if you named one |
| `{{YYYY-MM-DD}}` | Today |
| `{{INSPECTOR_PORT}}` | The inspector's port, derived from the project's name so two can run side by side |
| `{{PROJECT_ONE_LINER}}` | One sentence, used in three files |
| `{{GITHUB_OWNER}}` | GitHub account or organisation |
| `{{MAX_PARALLEL}}` | How many agents may run at once, in total — the kickoff asks; 1 is sequential |
| `{{LANGUAGE}}` `{{FRAMEWORKS}}` `{{PERSISTENCE}}` `{{HOSTING}}` | The decisions table |
| `{{PACKAGE_MANAGER}}` `{{TEST_STACK}}` `{{REPO_SHAPE}}` | The decisions table |
| `{{LAYER_DOMAIN}}` `{{LAYER_APPLICATION}}` `{{LAYER_INFRASTRUCTURE}}` `{{LAYER_INTERFACE}}` | Layer names — `domain/application/infrastructure/interface`, or whatever the stack calls them |
| `{{PATH_*}}` `{{DESC_*}}` | Where each layer lives and what is in it |
| `{{COMPOSITION_ROOT}}` | The one file allowed to import both sides |
| `{{ARCHITECTURE_CHECK}}` | The test or linter that enforces the dependency rule |
| `{{VERIFY_FAST}}` | The agents' gate: typecheck, lint, architecture check, unit tests — no ports, servers or emulators |
| `{{VERIFY_COMMAND}}` | The sprint lead's gate, once per wave: the fast verify, then contract suites, build and end-to-end |
| `{{DEV_COMMAND}}` `{{TEST_COMMAND}}` `{{LINT_COMMAND}}` `{{INSTALL_COMMAND}}` `{{DEPLOY_COMMAND}}` | The rest of the commands table |
| `{{SOURCE_TREE}}` | The stack-specific part of the repository layout |
| `{{SECRET_NAME}}` `{{EXT}}` `{{DEV_DESC}}` `{{path}}` | Example rows, file extensions and paths |

A `{{PLACEHOLDER}}` left in a committed file is a bug: the whole point is that an agent reading
these files cold finds real answers, not blanks. The inspector's Files view lists every file
that still holds one.

---

## Testing the template

```sh
node --test
```

From the repository's root, on Node 20 or newer. It runs the inspector's parser, renderer,
live state and server, the context report on a fixture, the two setup scripts, the checks that
the template agrees with itself, and the two git hooks for real, in throwaway repositories
with made-up passwords. The hook tests take about twenty seconds and need TruffleHog on the
PATH; without it they are skipped.
