# Log

> The project's history: one file per wave, `wave-NNNN.md`, written when the wave is recorded
> — by the sprint lead, or by the session that built a story by hand, which is a wave of one —
> and never edited afterwards (directive 21). The newest file is the latest
> news; what the project can do today is the **Now** line of `../BOARD.md`. `phase-0.md` is the
> foundation, before the first wave.
>
> Result is one of `verified`, `verified partly` (some stories returned or blocked),
> `nothing verified`, or `verified, by hand` for a story built with `/implement`, whose file has
> no Contexts lines.

The shape of a wave's file:

```md
# Wave 12 · S-004 · 2026-10-03 · verified partly

- **Stories** S-004.1 ✓ drag cards between columns · S-004.2 ✓ due dates · S-000.7 ✗ blocked
  (the wave's full verify stayed red on its files after one fix: the e2e test expected the
  old column ids; its commit reverted)
- **Now works** Cards can be dragged between columns and carry a due date.
- **Found** BUG S-000.8: autosave drops the last keystroke on blur → Ready, top.
- **Health** verify green, run 3 times · verifier pass · 3 agents · nothing needed from the
  owner.
- **Contexts** peak context per agent (ADR-0008):
  - session 3f9c2a1b · 520k · 388 requests · 0 compactions
  - S-000.7 rename the column ids · implementer · 410k · 162 requests · 0 compactions
  - S-004.1 drag cards between columns · implementer · 310k · 140 requests · 0 compactions
  - S-004.2 due dates · implementer · 280k · 122 requests · 0 compactions
  - Verify wave 12 · verifier · 390k · 131 requests · 0 compactions
```

The heading names the wave, the sprint it was built for, the date and the result. The
**Stories** line marks each story ✓ if it is committed on the sprint branch and ✗ if it is not,
and says why. The **Contexts** lines are what `tools/context-report.mjs` prints, pasted as they
are: one per agent and per session since the wave's planning commit — its description, which
for an agent starts with its story id, its type, its peak context, its requests and its
compactions.

A sprint's review is not in this folder: it is `review.md` in the sprint's own folder, written
after its last wave. Only a maintenance run, which has no folder of its own, leaves its review
here, as `wave-NNNN-review.md`.
