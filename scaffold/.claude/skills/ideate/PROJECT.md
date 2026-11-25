# /ideate, before Phase 0

For a freshly scaffolded project: the idea is the whole product, there is no git repository yet,
and the result is the brief `KICKOFF.md`. `/ideate` reads this file while it exists; Phase 0
deletes it in its last commit, and from then on `/ideate` thinks through one sprint at a time.

Until Phase 0 has run, `docs/FEATURES.md`, `docs/GLOSSARY.md` and `docs/board/LATER.md` are
empty forms and there is no code to read. Write in place: no worktree, no branch.

## The questions of a new product

They belong in the first rounds, before anything about how it is built:

- Who uses this, and what do they do today instead?
- What is the single feature whose absence makes it worthless?
- What must never happen? (lost data, a leak, downtime, a wrong number)
- Where does it run, and who pays for what it runs on?
- What is explicitly out of scope, and what is in the "later" parking lot?
- What do I already know I want technically, and what am I happy for you to decide?
- How much of GitHub should it use? The default, unless I say otherwise, is **version control
  only**: the repository is stored there and nothing runs there — no Actions, no pull requests,
  no branch protection, no Dependabot; every test, verify and TruffleHog secret scan runs on my
  machine, and autopilot deploys (ADR-0009). Offer the alternatives in one line each —
  a pull request per sprint, a deploy from GitHub Actions — and record anything beyond the
  default in the decision table, as the "GitHub" row.

Then the questions of its kind, if it is one of these:

- **A website**: where it is hosted and on which domain; who writes and updates the content,
  and how; whether search engines must find it; what a visitor does in the first ten seconds.
- **An app**: which platforms, through a store or not; whether it must work offline; accounts,
  sign-in and what happens to a user's data.
- **A game**: the engine, the platforms, and the one loop a player repeats.
- **Code that generates something** — 3D, images, data: what goes in, what comes out, in which
  format and for which tool, and how a result is judged good without a person looking at each
  one.

## What to produce, in this order

1. **A decision table.** Every technical choice, the decision, and one line of why. Mark any
   choice you are not confident about and say what would settle it.
2. **Sprints and their stories.** Phase 0 is foundation; after that, each sprint is one outcome
   with an observable "done when" that I could check myself without reading code, and the few
   stories that build it. Say what each story makes work and how I would know. Nothing in a
   sprint that could be deferred to the next one. The kickoff turns these into the board; any
   sprint can be added later without re-planning, so leave the nice-to-haves for "Later".
3. **The words.** The two or three nouns the whole system is built from, and any word we had to
   settle, go into `docs/GLOSSARY.md`: replace its example entry. What we parked or decided
   against goes into `docs/board/LATER.md`.
4. **The brief itself.** Show me the first two, change what I ask, and then fill in
   `KICKOFF.md` in this project's root, in place: replace every placeholder in double braces
   and every italic bracketed prompt with real content from this conversation, and delete the
   "How to use this file" blockquote at its top. Leave anything genuinely undecided marked as
   _ask_ rather than guessing.

Do not write any code in this session, and change no file but `KICKOFF.md`, `docs/GLOSSARY.md`
and `docs/board/LATER.md`. When the brief is written, tell me to open a fresh session here and
run `/kickoff` — not `/feature`: the kickoff builds the board from the brief.
