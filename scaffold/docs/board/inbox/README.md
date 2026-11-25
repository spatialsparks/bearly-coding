# Inbox

A single story that is not a sprint of its own — a bug, a chore, a small change — waits here
until the sprint lead files it. A planning session (`/fix`, or `/feature` and `/refactor` for
work that fits one story) writes it as `<slug>.md`, in the shape of `../_TEMPLATE-story.md`:

- the title keeps `S-NNN.N` as it is: the story has no number yet;
- **Sprint** names the sprint it belongs to — `S-000` unless it is plainly part of a sprint
  that is planned or in flight;
- a regression, something that worked and broke, says `**Regression** yes` on the line under
  the title.

At its next wave planning the sprint lead — or `/implement`, when the owner builds by hand —
gives each story the next free number in its sprint, moves it to
`docs/board/sprints/S-NNN-slug/S-NNN.N-<slug>.md`, and lists it in Ready — at the top if it is a
regression — or in Backlog with what it lacks. Numbering at filing, not at writing, is what
keeps a planning session and a running wave from both writing `S-000.12`.

On autopilot, a story filed under `S-000` is built in a free slot of the next wave and lands
with the sprint in flight; with no sprint in flight, the ready stories of `S-000` are a
maintenance run of their own. By hand, the owner picks it like any other story.

Between wave plannings this folder holds this file and the stories that are waiting.
