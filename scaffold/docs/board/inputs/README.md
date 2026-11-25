# Inputs

Everything that waits on the owner, one file each. Whoever is building — a sprint lead of
`/autopilot`, or the session of `/implement` — writes a file here the moment it needs something
only the owner can give, and carries on with whatever does not depend on it. `/resolve` goes
through the open ones with the owner, one by one. Answered and applied, a file moves to `done/`.

A file is `I-NNN-<slug>.md`, in the shape of `../_TEMPLATE-input.md`, numbered by whoever is
building, in order. It is written for someone who comes back days later and remembers nothing:
the question or the thing to do, why an agent cannot settle it, what it holds up, the options
with the one the builder would take — or the steps, with their addresses — and where the answer
goes.

## What becomes an input

| Kind | For example | The answer is |
| --- | --- | --- |
| `decision` | A choice the story or the spec left open; how a finding that survived two fixes is to be settled | The option chosen, or another |
| `secret` | An API key, a token, a service-account file | "Done" — the value goes into `.env` and the vault, never here |
| `setup` | A cloud project, a paid plan, an account, a repository setting, an API to switch on; a command the settings refused and a story cannot do without; a deploy that failed twice | "Done", with what the builder needs and is not secret: a project id, an address |
| `look` | A story that failed twice; a result only a person can judge | A hint for the next attempt, "I will build it by hand", or "take it out of the sprint" |
| `approval` | Landing a sprint when the board says `land: ask`; anything that would become public | Yes or no |
| `stop` | TruffleHog found a secret; the board itself is wrong; two sprint leads in a row changed nothing | What was done about it, and that building may go on |

## Two that hold more than a story

- **A `stop` holds every run.** While one is open, `/autopilot` does not start and no sprint
  lead builds. It is written only where going on could do harm (`docs/ORCHESTRATION.md`).
- **A deploy that failed twice holds every landing.** Its **Blocks** line says
  `every landing`. Building goes on, and what is finished stays `reviewed` on its branch;
  nothing more is pushed or deployed until the owner has answered and the deploy has passed.

A command the settings refused is a `setup` like any other: the file names the command, what
needs it, and the rule that would allow it. Whether to allow it is the owner's, and the owner
adds the rule to `.claude/settings.json` — no session loosens its own permissions.

## The life of an input

1. **Asked.** The builder writes the file with `**Status** open`, puts its id in the "Needs"
   column of the story's row in Blocked, and adds one line under "Blocked on the owner" in
   `docs/PROGRESS.md`. Then it goes on with everything that does not depend on it.
2. **Answered.** The owner fills in "Answer" and sets `**Status** answered` — through
   `/resolve`, or by editing the file. `/resolve` changes nothing else, and nothing in git.
3. **Applied.** At its next start, and at every wave planning, the builder takes each answered
   input: it does what "Where the answer goes" says, moves the story from Blocked back to
   Ready with a line in its History, takes the line out of `docs/PROGRESS.md`, and moves the
   file to `done/`. On autopilot it commits that; by hand the owner does.

**A secret is never written here** — not in "Answer", not in a step, not as an example — and
never typed into a session (directive 16). The file names the secret, says where to get it and
where to put it; the answer is that it is there.

Only whoever is building writes the files in this folder, apart from the two lines the owner
fills in. A planning session leaves a question that is still open under "Open questions" in the
sprint's spec; the builder turns it into an input when it lists that sprint on the board.
