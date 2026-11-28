# ADR-0010 — No limit on file length: concise, readable code that scales

**Date** {{YYYY-MM-DD}}
**Status** accepted — amended by ADR-0011 (the Standards reviewer checks it, once per sprint,
not the verifier; what is called a card here is now a story)

## Context

Directive 12 capped every source file, usually at 300 lines, and a linter enforced it. Its only
reason was a rule of thumb: a file that outgrows the limit is telling you it is two files.

Line count does not show whether a file has one job. A long table or a cohesive parser can be
fine at 500 lines, and a 200-line file can do two unrelated things. And since directive 15 forbids
weakening a gate, an agent at line 301 had to split the file whether or not that helped, leaving
more files and more imports to follow. The narrow reads of ADR-0008 are what keep a long file
from filling a context, not the cap.

What the cap never asked for is what the owner wants from the code: that it is concise and
readable, and that it keeps working as the data grows.

## Decision

- **A file has no length limit.** No linter rule, script or test checks one. A file is split when
  it has two jobs.
- **Code is concise, clean and readable**: the least code that says it clearly, with functions
  small enough to hold in your head.
- **Code scales.** On anything that grows with the data or the users, favour O(n) or better, or
  O(n log n) where it has to sort. Anything slower — a nested loop over the same data, a query
  inside a loop — needs a reason, given in the implementer's report. On data that is small and
  bounded, readability wins: a clearer O(n²) over ten items beats a cleverer O(n).
- **The verifier checks it**, once per sprint, as it checks everything no tool can.

This is about code written from now on. Files already split stay split, and existing code is
not rewritten to meet it; that would be a card.

## Consequences

- No agent splits a file only to get past a gate.
- Nothing mechanical stops a file growing without end. The verifier and the owner are the check,
  and a file holding two jobs is a finding, or a card from `/refactor`.
- A very large file touched by many tasks is harder to give to parallel agents, since owned paths
  may not overlap. The orchestrator then runs those tasks one after another, which is safe but
  slower, and a reason to split the file.
- Reading narrowly (ADR-0008) matters more. Its rule against printing a whole file of more than
  about 300 lines stays: it limits what an agent reads, not how long a file may be.

The context files — the root `CLAUDE.md`, a directory's `CLAUDE.md`, `docs/PROGRESS.md`, the
board, the glossary — have no line limit either (changed 2026-11-28). They are read whole, so
each is kept as precise and short as possible, with only what is necessary.

## Alternatives considered

| Alternative | Why not |
| --- | --- |
| Keep the cap at 300 | Forces splits that do not help, for a reason that was never measured. |
| A higher cap, such as 1000 | A smaller version of the same problem. The owner chose no number. |
| A linter rule for complexity | Cyclomatic complexity does not measure growth with the data, and a tool cannot tell which inputs grow. |
| Require O(n) outright | Some work is O(n log n) at best, and on small bounded data a clearer slower version is the better code. |
