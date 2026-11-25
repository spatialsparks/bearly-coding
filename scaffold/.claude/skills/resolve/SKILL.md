---
name: resolve
description: Go through what waits on the owner, one input at a time - the questions, secrets, set-up steps and approvals that whoever is building left in docs/board/inputs/ - write each answer into its file, and say what becomes ready. Changes nothing in git and nothing on the board.
argument-hint: '[an input, as I-NNN - default - every open one, the one that holds up the most first]'
disable-model-invocation: true
---

Go through what waits on me in {{PROJECT_NAME}}, one at a time. Whoever was building left a
file in docs/board/inputs/ for each thing only I can give. Walk me through them, write my
answer into each file, and stop. The builder acts on the answers the next time it starts.

Which: $ARGUMENTS

If nothing follows "Which:", take every input whose Status is `open`.

**Change only the files in docs/board/inputs/, and in them only "Answer" and the Status.**
Nothing in git: no commit, no push, no branch. Not the board, not docs/PROGRESS.md, not a
story, not a line of code. You record what I say; whoever builds next applies it.

**Never ask me for a secret, and never write one down.** For an input of kind `secret`, tell me
which secret it is, where its steps say to get it, and where it goes — `.env` and the vault of
docs/SECRETS.md. I put it there myself. Then ask only whether it is done. If I paste a secret
into this session by mistake, do not repeat it and write it nowhere: tell me to rotate it.

Read: docs/board/inputs/README.md, every open file in docs/board/inputs/,
docs/board/BOARD.md — its Sprints and Blocked tables — and "Blocked on the owner" in
docs/PROGRESS.md. Not the source.

1. **Say what there is**, a line each: its id, its kind, what is needed, what it holds up. Put
   first what holds up the most: a `stop`, which holds every run; then one that holds every
   landing; then an input a sprint is `waiting` on, then one that holds a story of the sprint
   in progress, then the rest by number. If nothing is open, say so and stop. If
   the board shows a story blocked on me and no file here says why, say so: the builder owes
   an input for it.
2. **Take them one at a time**, in that order. For each:
   - Say what is needed and why it is mine, in a few lines of your own. Do not read the file
     out to me.
   - A `decision` or an `approval`: put the options to me, the one the builder would take
     first, with room for an answer of my own. If you have a tool that puts a question as
     choices, use it. Ask again only if my answer would leave the builder guessing.
   - A `secret`, a `setup` or a `stop`: take me through the steps one by one, and wait for my
     word after each. Collect what the file asks me to bring back that is not secret — a
     project id, an address — and nothing else.
   - A `setup` that names a command the settings refused: say what the story needs it for,
     what the rule would let every agent run from then on, and what the story would have to
     do without it. Whether to allow it is mine, and I add the rule to .claude/settings.json
     myself: you never edit the settings.
   - A `look`: tell me what was tried and what each attempt ran into, then the ways on: a hint
     for the next attempt, written down as I give it; that I build it by hand, with
     `/implement` and its id; that it leaves the sprint; or that the story itself is wrong —
     which is `/fix` or `/refactor`, and not this session.
   - Facts are yours to find. If answering takes knowing what the code does today, look it up
     and tell me; the decision stays mine.
   - I may say **skip**: leave the file as it is and go on. I may say **stop**: go to step 4.
3. **Write the answer down** as soon as I have given it — in the file's "Answer" section, in my
   words, and complete enough that the builder needs nothing else: the option and why, the
   fact, "done on <date>". Set `**Status** answered`. Then the next one.
4. **Close.** How many are answered; which are still open, and what each of those holds up.
   Then what happens now: the answers are in the working tree, not committed. The next
   `/autopilot` applies and commits them when it starts — or, if it is running now, at its
   next wave — and `/implement` applies them when I next build by hand. Name the stories that
   become ready.
