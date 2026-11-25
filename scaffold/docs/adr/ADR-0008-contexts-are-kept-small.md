# ADR-0008 — Contexts are kept small: a fresh one per run, narrow reads, effort `high`

**Date** {{YYYY-MM-DD}}
**Status** accepted — amends ADR-0004 (effort `high`, but the verifier's `max`); amended by
ADR-0011 (what is called a sprint here is now a wave, with a fresh context per wave; the
reviewers also run at `max`, and the standards file is theirs alone to read) and by ADR-0013
(a sprint lead for every sprint: a fresh context each, without the owner typing `/clear`)

## Context

Opus 5.5 runs with a native window of 1M tokens, and Claude Code compacts it only at about 967k
(code.claude.com/docs/en/model-config). Nothing in the template kept a context smaller than
that. The owner measured what that cost in one of their projects built on it, over its sprints
12 to 18, from the Claude Code transcripts. A context here is `input_tokens +
cache_creation_input_tokens + cache_read_input_tokens` of one API request, and an agent's peak
is its largest.

One orchestrator session ran sprints 12 to 17 and was running 18. Each sprint added 90–215k to
it; it peaked at 955k, then compacted. That compaction came in the middle of sprint 16, and the
sprint landed fine: the orchestrator reconciles from the board, git and the draft pull request.
16 implementers peaked at 205k–705k, the median about 420k — every one of them over 150k. 6
verifiers peaked at 200k–640k. One architect reached 966k and was compacted.

What filled the contexts of 25 of those agents, at about 3.2 characters per token:

| Share | What |
| --- | --- |
| about 40% | Their own reasoning at effort `max`, kept in context. Inferred: the part no tool explains tracks the size of the thinking blocks' signatures, at a ratio of 0.29–0.40 in all 25 |
| about 33% | Tool output, three-quarters of it files read through the shell (`sed`, `cat`, `grep`) |
| about 12% | What they wrote: edits and commands |
| about 11% | Attachments, mostly directory `CLAUDE.md` files, which Claude Code attaches whole to every file read in their directory. That project has 19,600 lines of them; the largest has 1,690 |
| about 4% | The system prompt |
| under 1% | Chat text and the agents' reports — and the same for the fast verify's output |

The orchestrator cannot clear or compact its own context. Only the owner can: by typing
`/clear`, or by opening a new session. And `/sprint` runs sprints until its stop point — by
default until Ready is empty — all in one context.

## Decision

- **A fresh context for every run.** `/sprint` runs sprints until its stop point, and its final
  report ends by telling the owner to type `/clear` before the next `/sprint`; `/next` does the
  same, since relay mode is one task per context. For a fresh context for every sprint, the
  owner runs `/sprint 1` and types `/clear` between them. The board, the sprint log and
  `docs/PROGRESS.md` are already the hand-off for a cold start, while a compaction re-reads the
  whole context to write a lossy summary of sprints that are finished.
- **A run that chains sprints compacts early.** `.claude/settings.json` sets
  `autoCompactWindow` to `400000`, so an unattended session that runs sprint after sprint
  compacts by itself long before about 967k: every two or three sprints, since each added
  90–215k. Start at 400k, and lower it as the numbers allow.
  The docs don't say whether it applies to sub-agents; `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` is
  documented as applying to main conversations and sub-agents alike.
- **Agents read narrowly.** The implementer, the verifier and the architect find code with grep
  first, then read only the range they need, and never print a whole file of more than about
  300 lines — by `cat`, by `sed -n` over all of it, or by Read without a range. The verifier
  starts from `git diff --stat` and the diffs, and reads the code around a change only where the
  diff needs it. A card's **Read** field names the functions or sections to read, not just the
  files. A directory's `CLAUDE.md` keeps to its 40 lines, because Claude Code attaches the whole
  file to every file read in that directory.
- **Effort `high`, and `max` for the verifier.** Sessions get it through
  `CLAUDE_CODE_EFFORT_LEVEL` under `env` in `.claude/settings.json`, the implementer and the
  architect through `effort: high`. The verifier stays at `max`: it runs once per sprint, so it
  costs little, and it is the check on the lowered effort everywhere else.
- **Every agent is measured.** `tools/context-report.mjs`, vendored like the inspector, reads
  the transcripts written since the sprint's planning commit. When the orchestrator records a
  sprint, it writes one line per agent into the sprint log: its id, its type, its peak context
  and its compactions.
- **The budget comes later.** The owner aims at about 150k per agent context. That is an aim,
  not yet a rule: the budget per card is set later, from these numbers, and that rule will split
  the kinds of card that run over.

## Consequences

**Good.** The estimate is that these changes take the median implementer from about 420k to
roughly 250–300k; budgets per card do the rest. Each run starts from the board, not from a
summary of the runs before it, and a run that chains sprints compacts at 400k instead of at
967k. The sprint log shows each agent's peak, so the budget can be set from numbers rather than
from a guess.

**Bad.** Effort `high` reasons less than `max`. A hard task may fail where `max` would have
passed, and cost a retry; the verifier at `max` catches what it reads, not what it does not.
The owner now types `/clear` between runs, and runs `/sprint 1` with a `/clear` between sprints
for a fresh context each. A run that chains sprints compacts every two or three of them,
wherever it has got to, each time into a lossy summary. A narrow read can miss what lies
outside its range — the invariant forty lines above a grep hit — so the card's **Read** list
and the directory `CLAUDE.md` must name it. The report reads Claude Code's transcripts, whose
format is not a documented interface: when it changes, the report may print zeros, and the
script is fixed in the bearly-coding template and copied again. Since the docs don't say
whether `autoCompactWindow` reaches sub-agents, an agent can still grow to about 967k. And a
transcript is not a card: a retried task shows twice, and a planning session that ran during
the sprint shows too.

**Cost to reverse.** Low: two keys in `.claude/settings.json`, the `effort:` line of two agent
definitions, a paragraph in each agent definition and brief, the last line of two commands, and
the sprint log's **Contexts** lines, which can simply stop being written.

## Alternatives considered

| Alternative | Why not |
| --- | --- |
| Keep effort `max` everywhere, and only read narrowly | Reasoning kept in context was the largest share, about 40%, and narrow reads do not touch it. |
| Lower the verifier to `high` too | It runs once per sprint, so `max` costs little there, and it is the check on everything that now runs lower. |
| Leave a run that chains sprints to compact at about 967k | By then it carries every sprint before it: one session reached 955k. A compaction re-reads the whole context to write a lossy summary of finished sprints, and the board, the sprint log and `PROGRESS.md` already hand the next sprint everything it needs. |
| Make `/sprint` run one sprint by default | The owner would lose the unattended runs that chain sprints while they are away. `/sprint 1` gives one sprint per context when that is wanted. |
| Start `autoCompactWindow` lower, at 200k | Each sprint added 90–215k to the orchestrator, so it would compact in nearly every sprint, as often in the middle as at the end. |
| A budget per card now, of about 150k | Every implementer measured ran over it: a rule nobody keeps. It is set from the sprint log's numbers instead. |
| Measure with a script in Python | The inspector's server already needs Node, and nothing here needs Python: one runtime for both tools. |
