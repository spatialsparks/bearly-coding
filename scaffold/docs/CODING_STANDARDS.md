# Coding standards — what a reviewer checks

> Read by whoever reviews: the Standards reviewer at the end of a sprint, `/sprint-review` and
> `/project-review`. **Not read by implementers**, whose context is for their story (ADR-0008,
> ADR-0011). An implementer follows the directives; a reviewer holds the result against this
> file.
>
> A rule a tool can check does not belong here. It becomes a check — a lint rule, a rule of
> `{{ARCHITECTURE_CHECK}}` with the fixture that proves it fires — because a check cannot be
> forgotten. This file is for what takes judgement. `/retro` adds to it, and removes what a
> check has since taken over.

## Where the rules are

| Rule | Breaking it is |
| --- | --- |
| `docs/PRIME_DIRECTIVES.md`, Architecture and Code (directives 1 to 15) | must fix |
| "This project's standards", below | must fix |
| `docs/GLOSSARY.md` — a name that uses a word under _Avoid_, or a new word for a thing that has a term | for the owner |
| "The baseline", below | for the owner |

A written standard always outranks the baseline: where this project endorses something the
baseline would flag, the baseline is silent. Skip whatever the linter, the type checker or the
architecture check already enforce.

## This project's standards

_[Rules this project has learned, each with the reason and the sprint that taught it. For
example: "A use case returns a result, it does not throw for an expected refusal — a thrown
refusal was swallowed twice in S-006." Empty until the first retro.]_

## The baseline

Signs that code may be heading the wrong way. Each is a question to ask, never a verdict: name
it, quote the lines, and say what you would do instead.

| Smell | What it looks like | Usually better |
| --- | --- | --- |
| Mysterious name | A function, variable or type whose name does not say what it does or holds | Rename it. If no honest name comes, the design is unclear |
| Duplicated logic | The same shape of logic in more than one place in the change | One function, called from both |
| Feature envy | A function that uses another object's data more than its own | Move it to the data it keeps reaching for |
| Data clump | The same few values travelling together through several signatures | One type that holds them |
| Primitive obsession | A string or number standing in for a concept of the domain | A small type of its own, named in the glossary's words |
| Repeated switch | The same `switch` or chain of `if`s on the same value, more than once | One table or one polymorphic call that all sites share |
| Shotgun surgery | One logical change that needed edits scattered over many files | Gather what changes together into one module |
| Divergent change | One file edited for several unrelated reasons | Split it, so each part changes for one reason |
| Speculative generality | A parameter, hook or abstraction the spec has no use for (directive 10) | Delete it until something needs it |
| Message chain | `a.b().c().d()` — a caller walking a structure it should not know | One method on the first object that does the walk |
| Middle man | A class or function that only passes calls on | Call the real thing |
| Refused bequest | A subtype that ignores or overrides most of what it inherits | Composition instead of inheritance |
| Shallow module | An interface nearly as large as what it hides, so it saves its caller nothing | Fold it into its caller, or give it more to hide |
| Slow on growing data | A nested loop over the same data, or a query inside a loop, where the data grows (directive 12) | A lookup table, a join, one batch query — or the reason it is fine |
