# bearly-coding

**Plan it as sprints. Build it by hand or on autopilot.**

bearly-coding is a plugin for Claude Code. It gives a project a board of sprints and stories, a
small team of agents that builds them, and skills written for the stack you chose. Nothing is
pushed before it has been reviewed.

![One sprint on autopilot: five stories cross the board in two waves, then the sprint is reviewed and lands.](docs/board.svg)

**[See it in motion →](https://spatialsparks.github.io/bearly-coding/)** Step through a sprint
on autopilot, watch what happens when a story needs you, and browse every command.

## Why it exists

I built bearly-coding to help me with my own work. It is the workflow I have coded a variety of
different apps with, and it grew with each of them before it became a plugin of its own.

There are great libraries of agent skills already, and
[Matt Pocock's skills](https://github.com/mattpocock/skills) are among the best. They did not
fit my style, though. So I kept my own workflow, took the concepts of his that I found most
interesting, and worked them into mine. The [credits](#licence-and-credits) name each one.

## Install

In any Claude Code session, in the terminal or the desktop app:

```text
/plugin marketplace add spatialsparks/bearly-coding
/plugin install bearly-coding@bearly-coding
```

You also need git, [Node](https://nodejs.org) 20 or newer, and
[TruffleHog](https://github.com/trufflesecurity/trufflehog), which checks every commit for
secrets.

## From an idea to a first sprint

![Four steps, each in a fresh session: /bearly-coding:new, /ideate, /kickoff, then /implement by hand or /autopilot by itself.](docs/flow.svg)

| | You type | What happens |
| --- | --- | --- |
| 1 | `/bearly-coding:new my-thing` | Asks what you are building, then writes the workflow into a new project folder: the commands, the agents, the board, the documents and the git hooks. The project carries everything it needs. |
| 2 | `/ideate <your idea>` | Interviews you in rounds, hardest questions first, each with the answer it would pick. It writes the project's own words and decisions down as they settle. No code yet. |
| 3 | `/kickoff` | Runs once. It sets up the repository, the tooling, the architecture skeleton and the board, with the first sprint cut into stories. It also starts one agent for each part of your stack, to write that part's skill. |
| 4 | `/implement` or `/autopilot` | Build. One story at a time with you in the room, or the whole board by itself. |

Steps 2 to 4 each start in a fresh session opened in the new project. When you are unsure what
comes next, `/standup` says where things stand and which command to type.

## Three words

| Word | What it is | On disk |
| --- | --- | --- |
| **Sprint** `S-012` | One outcome you asked for: its spec, and the stories that build it | A folder, `docs/board/sprints/S-012-share-links/` |
| **Story** `S-012.3` | One piece of a sprint: one agent, one fresh context, one commit | A file in that folder |
| **Wave** | The stories built at once: the ready ones that are provably independent | A file in `docs/board/log/`, once it is verified |

## Two ways to build, and no mode to set

The command you type says what happens. The plain name is the careful one.

**`/implement` builds one story, by hand.** It asks which story, builds that one in your
checkout, test first, and stops with a report. It asks before a new dependency, a changed
contract or a choice between two designs. Git is yours: it never commits.

**`/autopilot` builds the board, by itself.** Your session starts one sprint lead per sprint,
each with a fresh context. A sprint lead builds its sprint in waves: one implementer per story,
each in its own git worktree, then one verifier per wave, then two reviewers once the sprint is
complete. Only then is the sprint merged into `main`, pushed and deployed. It never stops to
ask: what needs you becomes a file, everything that does not depend on it goes on, and
`/resolve` takes you through those files afterwards. To turn autopilot off, stop the session.
Nothing is scheduled.

## Every command

Two come with the plugin. The rest are written into each project, so they have no prefix and
you can change them there.

| Command | Does |
| --- | --- |
| `/bearly-coding:new` | Starts a project, a light workspace for a small tool, or a folder for thinking an idea through |
| `/bearly-coding:update` | Brings an existing project onto the workflow, or up to date with it |
| `/ideate` | Thinks an idea through with you, in rounds of questions |
| `/kickoff` | Repository, stack skills, tooling, skeleton and board. Once |
| `/implement` | One story by hand. You commit |
| `/autopilot` | The board by itself, for days if need be |
| `/resolve` | Takes you through what building is waiting on |
| `/feature` | Adds a sprint: its spec and its stories |
| `/fix` | Adds one story for a bug, reproduced first |
| `/refactor` | Adds a restructuring, behaviour pinned by tests first |
| `/sprint-review` | Two reviewers on demand: spec and standards |
| `/project-review` | A survey of the codebase for what would improve it |
| `/retro` | Moves what a sprint taught into the documents and the skills |
| `/stack-skills` | Has the skill for a part of the stack written or refreshed |
| `/standup` | Where things stand, and the next command |
| `/board` | The board in your browser, live while a wave runs |

Every command that plans is safe while a sprint is being built: it writes on a branch of its
own, and the builder picks it up.

## Skills for your stack, written by your project

There is no library to install and none to outgrow. `/kickoff` starts one skill writer for each
part of your stack: the language and its tooling, the framework, the database, the test
runner, the host. Each writer has a fresh context, reads that part's own documentation for the
version you use, and writes one skill into the project's `.claude/skills/`. Every rule names
the page it came from, and what a writer could not confirm is listed as open instead of
guessed.

Every agent that touches a part reads its skill first. `/retro` adds what a sprint taught, and
`/stack-skills` writes one for a part that joins later. Claude Code asks you before a writer
reads a site and before a skill is written, so you see every skill before it is committed.

## What it holds to

- **Private by default.** A new repository is created private. Nothing becomes public without
  your yes.
- **Secrets stay out of git.** TruffleHog checks every commit and every push, and both are
  refused when it is missing.
- **Reviewed before it leaves.** A sprint stays on your machine until two reviewers have read
  it as a whole.
- **Every check runs locally.** No CI to pay for and no pull requests to shepherd, unless your
  project decides otherwise.
- **Agents on autopilot never ask and never guess a permission.** What the project's settings
  do not allow is refused, and costs one story, not the run.

## More

- [The bearly-coding page](https://spatialsparks.github.io/bearly-coding/): the workflow to
  click through, with a sprint you can step through.
- [How it works](docs/how-it-works.md): the board, the agents, a sprint move by move, and why
  each rule is there.
- [What a new project starts with](scaffold/): every file is plain Markdown or a small script,
  and yours to change once it is in your project.
- [Changelog](CHANGELOG.md).

## Contributing

Bug reports and ideas are welcome as
[issues](https://github.com/spatialsparks/bearly-coding/issues). Pull requests are open only to
collaborators I invite: this is the workflow I build my own apps with, and I keep it in one
voice. If you would like to help with something, open an issue first.

A security problem goes through private reporting, never an issue: see [SECURITY.md](SECURITY.md).

## Working on the template

```sh
node --test                                   # every test, from the repository's root
git config core.hooksPath scaffold/.githooks  # once per clone: TruffleHog on every commit and push
```

The tests include two that run the git hooks for real, in throwaway repositories with made-up
passwords. They take about twenty seconds and are skipped when TruffleHog is not installed.

## Licence and credits

MIT, see [LICENSE](LICENSE).

The interview in rounds, the glossary, the test for when a decision deserves a record, the
story slices, test first, the two-axis review and the retro are adapted from
[Matt Pocock's skills](https://github.com/mattpocock/skills) (MIT). They are written into this
template in its own words, and no project needs that plugin installed.
