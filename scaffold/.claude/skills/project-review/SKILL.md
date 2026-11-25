---
name: project-review
description: Survey the whole codebase, or one area of it, for what would make the project better - where the design fights the work, where tests prove nothing, where the documents have gone stale - write the candidates into docs/reviews/, and turn the ones the owner picks into sprints or stories.
argument-hint: '[an area or a worry to look at - default - the code that changes most]'
disable-model-invocation: true
---

Go through {{PROJECT_NAME}} and tell me where it could be better. This is not a review of a
change: it is a survey of what is there, and its result is a short list of improvements worth
their cost. You do not read the code yourself: reviewers do, each with one lens, and you weigh
what they bring back.

Where to look: $ARGUMENTS

If nothing follows "Where to look:", let the history decide. Improving a module pays back when
that module is changed again, so the code that keeps changing is where to look:

```sh
git log --since="3 months ago" --name-only --format= | sort | uniq -c | sort -rn | head -40
```

Code nobody touches is not worth improving (directive 10).

Read: CLAUDE.md, docs/GLOSSARY.md, docs/ARCHITECTURE.md, docs/CODING_STANDARDS.md,
docs/PROGRESS.md — its known debt is known: do not report it again —, docs/board/LATER.md —
what was decided against stays decided —, docs/board/BOARD.md, the names of the files in
docs/adr/, and docs/PLANNING.md. A decision in an ADR is not reopened, unless the friction it
causes is real: then say so plainly, as a candidate.

1. **Scope.** Name the three to six areas you will have looked at, and why — from what I
   typed, or from the history. Tell me, then go on.
2. **Spawn one reviewer per lens**, in one message, in the foreground:
   `subagent_type: "reviewer"`, `isolation: "worktree"`, each with the areas and its lens. They
   count against `max_parallel` in docs/board/BOARD.md; if a sprint is in flight, ask me before
   you start more than two.
   - **Design.** Where does understanding one thing mean jumping between many small modules?
     Which modules are shallow — an interface nearly as large as what it hides; would deleting
     one concentrate complexity, or only move it? Where do two slices know each other's
     internals, or a layer leak through a port in a way `{{ARCHITECTURE_CHECK}}` cannot see?
     Where was logic pulled out only to be testable, while the bugs live in how it is called?
   - **Code health.** The baseline of docs/CODING_STANDARDS.md across those areas: the same
     logic twice, dead code, abstraction nothing uses, anything slow on data that grows, names
     that go against the glossary.
   - **Tests.** Logic in `{{LAYER_DOMAIN}}` and `{{LAYER_APPLICATION}}` with no test that would
     fail if it broke. Tests that recompute their own expectation, or reach into internals and
     break on every restructuring. The slowest tests in `{{VERIFY_COMMAND}}`. End-to-end tests
     beyond one path per sprint.
   - **Documents.** A directory `CLAUDE.md` over its 40 lines, or describing code that has
     moved. An entry of docs/FEATURES.md that is no longer true. A glossary term the code does
     not use, and a word the code uses for which the glossary has another. An ADR the code
     contradicts. Known debt that is gone.

   Ask each for **candidates**, at most six: where, what hurts — with the evidence: the files,
   the commits that show it —, what would change, what becomes easier afterwards, what it
   costs — one story, or a sprint — and how sure it is: strong, worth a look, or speculative.
3. **Write the report**, in a worktree of your own on a `plan/` branch, as
   docs/PLANNING.md says: `docs/reviews/<YYYY-MM-DD>-project-review.md`. One section per lens,
   as it came. Above them your own short list across the lenses: the five that would make the
   most future work easier for what they cost, each in two lines, and what you would do first.
4. **Ask me which to take on.** For each one I pick:
   - one agent in one session: a story in docs/board/inbox/, as `/fix` writes it;
   - more: interview me as `/refactor` does, and write a technical sprint — or, if it needs
     thinking through, tell me to take it to `/ideate`.
   A candidate I turn down for a reason that will last goes into docs/board/LATER.md, under
   "Decided against", so the next survey does not bring it back.
5. **Land it**: commit the report and whatever step 4 wrote, as
   "docs: project review <date>", and push the branch. `/autopilot` merges it into main at
   its next wave planning, and `/implement` offers to bring it in. Tell me that it waits
   there.

Never fix anything here, and change no source file, no test and no check: this session finds
the work, a sprint does it.
