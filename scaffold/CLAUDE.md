# {{PROJECT_NAME}} — root context

{{PROJECT_ONE_LINER}}

This file is level 0. It has no line limit: keep it as precise and short as possible, with only
what is necessary. If something here needs a paragraph, it belongs in `docs/` and gets one line
here pointing at it.

## Read these first, every session

1. `docs/PRIME_DIRECTIVES.md` — non-negotiable rules. Read before writing any code.
2. `docs/PROGRESS.md` — where the project is, and whether a sprint is in flight.
3. `docs/board/BOARD.md` — the sprints and their stories: ready, in a wave, blocked, done.
4. `docs/GLOSSARY.md` — the project's words. Use them in every name, never the ones to avoid.
5. `docs/ARCHITECTURE.md` — the authoritative architecture. It supersedes `KICKOFF.md`.

Then read the `CLAUDE.md` of every directory you are about to touch. Never scan the whole
repository: find code with grep, then read only the lines you need (ADR-0008).

## Prime directives, short form

- Dependencies point inward: `{{LAYER_INTERFACE}}` → `{{LAYER_APPLICATION}}` →
  `{{LAYER_DOMAIN}}`, and `{{LAYER_INFRASTRUCTURE}}` → `{{LAYER_APPLICATION}}` →
  `{{LAYER_DOMAIN}}`. `{{LAYER_INTERFACE}}` never imports `{{LAYER_INFRASTRUCTURE}}`.
  Enforced by `{{ARCHITECTURE_CHECK}}`, and a test proves each of its rules fires.
- `{{LAYER_DOMAIN}}` imports nothing but the standard library. Pure data, pure functions, no I/O.
- Every external system sits behind a port. Ports get a memory fake and a shared contract suite.
- `{{COMPOSITION_ROOT}}` is the only file allowed to import both use cases and concrete adapters.
- Slices never import each other's internals. Shared things move down, never sideways.
- YAGNI. A new dependency needs a row in the ledger of `docs/adr/ADR-0003-dependencies.md`. No
  interface with one implementation unless it is a port with a memory fake.
- Code is concise, clean and readable, with no limit on a file's length: split a file when it has
  two jobs. Favour O(n) or better on what grows; anything slower than O(n log n) needs a reason.
- Tests go where the logic lives — domain, use cases, port contracts, one end-to-end path per
  sprint — and are written before the code. Never weaken a gate to get to green.
- Agents run `{{VERIFY_FAST}}`; `{{VERIFY_COMMAND}}` runs once per wave, or per story built by
  hand. Everything runs locally; GitHub only stores the repository (ADR-0009).
- Two ways to build (ADR-0012). `/implement`: one story by hand, and the session commits
  nothing — the owner does. `/autopilot`: a sprint lead for every sprint (ADR-0013), on a local
  `sprint/S-NNN` branch, a commit per story, on `main` and deployed only when reviewed and
  finished (ADR-0011); only it writes `main`. Never force-push, never `--no-verify`.
- Parallel only when provably independent: no dependency between them, no overlapping owned
  paths, no contract change. At most `max_parallel` agents. Agents never wait on each other.
- Only whoever is building writes the board, the log, `docs/PROGRESS.md`, this file, ADR numbers.
- Secrets never reach the repository — TruffleHog checks every commit and push
  (`.githooks/`), and `docs/SECRETS.md` says the rest. Every secret also has a copy in
  `{{SECRETS_VAULT}}`. Nothing becomes public without asking.

The long form is `docs/PRIME_DIRECTIVES.md`; it wins where the two differ, and a directive's
number always means the long form.

## Repo map

| Path | What lives there |
| --- | --- |
| `{{PATH_DOMAIN}}` | {{DESC_DOMAIN}} |
| `{{PATH_APPLICATION}}` | {{DESC_APPLICATION}} |
| `{{PATH_INFRASTRUCTURE}}` | {{DESC_INFRASTRUCTURE}} |
| `{{PATH_INTERFACE}}` | {{DESC_INTERFACE}} |
| `{{PATH_TESTS}}` | {{DESC_TESTS}} |
| `docs/board/` | The board: `BOARD.md`, a folder per sprint in `sprints/` with its spec and stories, `inbox/`, `inputs/`, `log/` |
| `docs/` | Directives, architecture, glossary, features, progress, ADRs |
| `.claude/skills/` | The stack's skills (`docs/STACK_SKILLS.md`), loaded when work touches their part, and the owner's commands |
| `tools/inspector/` | The owner's browser view of the board (ADR-0006). Vendored: never read it, never edit it |
| `tools/context-report.mjs` | Each agent's peak context, for the log (ADR-0008). Vendored: run it, never edit it |

## Commands

| Command | Does |
| --- | --- |
| `{{DEV_COMMAND}}` | {{DEV_DESC}} |
| `{{VERIFY_FAST}}` | Typecheck, lint, architecture check, unit tests. No ports — safe in parallel |
| `{{VERIFY_COMMAND}}` | The fast verify, contract suites, build, end-to-end. The sprint lead's gate, once per wave |
| `{{TEST_COMMAND}}` | Unit tests only |
| `{{LINT_COMMAND}}` | Lint and format |

## Read X when doing Y

| Doing | Read |
| --- | --- |
| Anything | `docs/PROGRESS.md`, `docs/board/BOARD.md`, then the directory `CLAUDE.md` |
| A story | the `sprint.md` in its folder under `docs/board/sprints/`, then the story |
| Building a story by hand or on autopilot, reviewing or landing a sprint | `docs/ORCHESTRATION.md` |
| Planning: an idea, a sprint, a story, a retro | `docs/PLANNING.md`, `docs/FEATURES.md`, `docs/board/LATER.md` |
| Writing a sprint's spec or a story | `docs/AGENT_WORKFLOW.md`, `docs/board/_TEMPLATE-*.md` |
| Reviewing code | `docs/CODING_STANDARDS.md` — reviewers only, never an implementer |
| Moving code between layers | `docs/ARCHITECTURE.md` and `{{ARCHITECTURE_CHECK}}` |
| Adding a dependency | `docs/adr/ADR-0003-dependencies.md` — a solo story |
| Touching stored data or a file format | `docs/STORAGE_FORMAT.md` — a solo story |
| Touching anything with a key in it | `docs/SECRETS.md` |

## Definition of done

**A story:** `{{VERIFY_FAST}}` green; only its owned paths changed; tests for the logic it added,
written first (directive 14); the directory `CLAUDE.md` updated where a public surface changed;
a proposed ADR for a decision its file did not fix; committed on its branch, or left to the owner.
**A wave:** every story one commit on the sprint branch, or returned or blocked;
`{{VERIFY_COMMAND}}` green and the verifier's verdict pass; board, log and progress recorded.
**A sprint:** every story done; both reviewers have read it and every must-fix is fixed; one
merge commit on `main`, pushed through TruffleHog, and deployed if the project deploys.
