# Prime directives

These rules are non-negotiable. If a story appears to require breaking one, **stop and report
the conflict rather than breaking it quietly.** Numbers are stable: new rules are appended, not
inserted, so "directive 9" means the same thing in six months.

## Architecture

1. **Dependency direction is always inward.** `{{LAYER_INTERFACE}}` → `{{LAYER_APPLICATION}}`
   → `{{LAYER_DOMAIN}}`; `{{LAYER_INFRASTRUCTURE}}` → `{{LAYER_APPLICATION}}` →
   `{{LAYER_DOMAIN}}`. Never the reverse, and never sideways between `{{LAYER_INTERFACE}}` and
   `{{LAYER_INFRASTRUCTURE}}`.

2. **`{{LAYER_DOMAIN}}` imports only the standard library.** No web framework, no ORM, no
   client SDK, no validation or serialization library. Domain code is pure data and pure
   functions, and must be testable with no I/O, no mocks and no fixtures.

3. **`{{LAYER_APPLICATION}}` imports only `{{LAYER_DOMAIN}}` and its own ports.** Use cases
   receive their dependencies through the constructor as port types. They never construct an
   adapter, never read environment variables, and never know which implementation they got.

4. **Every external system sits behind a port.** Database, cache, file store, HTTP client,
   message bus, clock, randomness, third-party SDK. If a use case needs the outside world,
   define or reuse a port.

5. **`{{LAYER_INTERFACE}}` never imports `{{LAYER_INFRASTRUCTURE}}`.** Routes, handlers, CLI
   commands and views depend on use cases only. Concrete adapters are resolved in
   `{{COMPOSITION_ROOT}}`, the single file permitted to import both sides.

6. **One use case, one public entry point.** A use case exposes exactly one way in. If you need
   a second, you have a second use case.

7. **Every port has a memory fake and a shared contract test suite.** The suite is exported as
   a function taking a factory, and every implementation of that port — memory, real, future —
   runs it. The real implementation runs it against a local emulator, container or instance,
   inside `{{VERIFY_COMMAND}}`, never against a cloud project. A port with one implementation
   and no fake is not a port, it is indirection.

8. **A vertical slice owns its own internals.** Slices and feature modules never import each
   other's internals. Anything two slices need moves down into `{{LAYER_DOMAIN}}` or a shared
   primitives module. Never sideways, never via a barrel file that re-exports someone else's
   guts.

9. **The dependency rule is enforced by `{{ARCHITECTURE_CHECK}}`, which runs in both verify
   commands, and a test proves each of its rules fires** on a deliberately illegal fixture — a
   rule that matches nothing passes forever. Besides direction, the check forbids import
   cycles, imports that resolve to nothing, and dev-only dependencies in shipped code. If the
   check fails, the design is wrong, not the check. Do not add an exception to it without an
   ADR that says why the rule genuinely does not apply.

## Code

10. **YAGNI.** The smallest change that works. Standard library and platform features before a
    dependency. No abstraction added for a future that is not on the board. No interface
    with a single implementation unless it is a port with a memory fake.

11. **Every new dependency gets one row in the ledger of `docs/adr/ADR-0003-dependencies.md`**
    saying why nothing already installed sufficed. Versions are exact, and the package manager
    is configured to save them exact; the lockfile is committed and every install is frozen. A
    dependency may run an install script only if an allowlist names it. The runtime version is
    pinned in the repository and supplied by the toolchain, not by whatever is on `PATH`.

12. **Code is concise, clean and readable, and it scales.** Write the least code that says it
    clearly, with functions small enough to hold in your head. A file has no length limit: split
    it when it has two jobs, not when it reaches a number. On anything that grows with the data
    or the users, favour O(n) or better, or O(n log n) where it has to sort. Anything slower — a
    nested loop over the same data, a query inside a loop — needs a reason. On data that is small
    and bounded, readability wins (ADR-0010).

13. **No magic numbers for domain thresholds.** Anything a person could argue about is a named,
    documented constant with a configurable override.

14. **Tests go where the logic lives, and land with the change.** Every rule, calculation and
    decision in `{{LAYER_DOMAIN}}` and `{{LAYER_APPLICATION}}` has a test that fails if it
    breaks, and every port has its contract suite (directive 7). Wiring, pass-through adapter
    code, views and configuration get no test of their own. A sprint has one end-to-end test —
    its main path — written by the story that completes it, not one per story. The test comes
    first: write it, watch it fail, then write the code. Do not add test frameworks beyond
    {{TEST_STACK}} (ADR-0007, ADR-0011).

15. **Never weaken a gate to get to green.** Do not delete or skip a test, remove an assertion,
    relax a threshold, add a suppression comment, or narrow a check so it passes. If the gate
    is genuinely wrong, say so and ask.

## Secrets and exposure

16. **No secret ever reaches the repository.** No key, token, password, connection string,
    service-account file or `.env` in a commit, a test fixture, a doc or a commit message.
    TruffleHog checks every commit before it exists and every push before it leaves the
    machine — the hooks in `.githooks/` — and nobody commits or pushes with `--no-verify`.

17. **Every secret also has a copy in `{{SECRETS_VAULT}}`**, so keeping it out of git never
    means losing it. `docs/SECRETS.md` holds the inventory — names and locations, never values.

18. **Nothing becomes public without an explicit yes.** The repository is private. The deploy
    targets the kickoff approved are the only public surface, and only a sprint lead deploys
    to them (directive 28). Do not make the repository public,
    publish a package, deploy anywhere else, or open a public issue or gist without asking
    first.

## Process

19. **Update the context files inside the change, not afterwards.** A story updates the
    `CLAUDE.md` of every directory whose public surface it changed. Each wave is recorded on
    the sprint branch before the next one starts — the board, its log file and
    `docs/PROGRESS.md` — so a sprint that lands is always recorded. No context file has a line
    limit: each is as precise and short as possible, with only what is necessary.

20. **Record the decisions that matter as ADRs.** A technical choice that is hard to reverse,
    surprising without its context, and the result of a real trade-off gets
    `docs/adr/ADR-NNNN-<slug>.md` in the standard format: Context, Decision, Consequences,
    Alternatives considered. A smaller one is a line under Decisions in its sprint's spec.

21. **The log is append-only.** A wave's file in `docs/board/log/` is written once, when the
    wave is recorded; never edit or delete one, not even to fix a typo. What is rewritten is
    the **Now** line in `docs/board/BOARD.md`, every time a sprint lands.

22. **`docs/ARCHITECTURE.md` is the source of truth once reality diverges from the original
    brief.** Record the divergence and the reason there.

23. **Two gates, both green, both local.** `{{VERIFY_FAST}}` — no ports, servers, containers or
    emulators — is green before an agent hands a story back. `{{VERIFY_COMMAND}}` — the fast
    verify, then the contract suites, the build and the end-to-end tests — is run by the
    sprint lead once per wave, on the sprint branch with every story of the wave committed,
    and again only after a fix; for a story built by hand, by its session before it reports. A
    sprint lands only from a commit it was green on. Nothing runs
    on GitHub: every test, every verify and every secret scan runs on this machine (ADR-0007,
    ADR-0009).

24. **Leave the repository cold-startable.** When a wave is recorded, a fresh session that reads
    only `CLAUDE.md`, `docs/PROGRESS.md` and `docs/board/BOARD.md` must be able to plan the next
    wave or pick up the next story correctly. If that would not work, the wave is not done.

25. **Do not fabricate external state, and do not work around a refusal.** If a story needs a
    cloud resource, a secret, a paid plan, an account, a repository setting or an approval,
    stop and ask with exact instructions, and record the block in `docs/PROGRESS.md`. A command
    the project's settings refuse is such a block too: never look for another way to run it.
    Do the step honestly another way, or report the refusal — allowing it is the owner's.

26. **Every change lands with its sprint, one sprint at a time, and GitHub only stores it.**
    After Phase 0, stories are built on `story/` branches in their own worktrees and become
    one commit each on the local `sprint/S-NNN` branch. A sprint reaches `main` as one merge,
    and is pushed and deployed, only when every story is in, both reviewers have read it, and
    what they said must be fixed is fixed. Only one sprint is in flight. Planning sessions
    commit new sprints and inbox stories on branches of their own, which the sprint lead
    merges. On autopilot only the sprint lead writes `main`, and never with a force push.
    A story built by hand, with `/implement`, is committed and pushed by the owner, never by
    the session that built it. GitHub holds the repository and nothing else — no Actions, no
    pull requests, no branch protection — unless an ADR says otherwise. The protocol is
    `docs/ORCHESTRATION.md` (ADR-0005, ADR-0009, ADR-0011, ADR-0012, ADR-0013).

27. **Storage-format changes need a version bump, a migration note and an ADR.** When the
    project persists anything, `docs/STORAGE_FORMAT.md` is the contract, and its golden corpora
    are compared byte for byte, so they are never reformatted.

28. **Only a sprint lead deploys, and only `main`.** Hosting, database rules, migrations and
    indexes ship with `{{DEPLOY_COMMAND}}`, from a clean checkout of `main` just after a sprint
    has landed, together with the code that needs them — and a sprint reaches `main` only after
    `{{VERIFY_COMMAND}}` was green on it (directive 23). No implementer, verifier, reviewer,
    architect or planning session deploys or runs a destructive cloud command, and neither does
    a session building by hand: what the owner landed, the owner deploys.

29. **Parallel only when provably independent.** Two stories share a wave only when neither
    depends on the other, their owned paths do not overlap, and neither changes a contract;
    otherwise they run in separate waves, and at most `max_parallel` agents run at once.
    Agents never wait on each other: one that finds an unplanned dependency stops and reports
    it. Only whoever is building writes the board, the log, `docs/PROGRESS.md`, the root
    `CLAUDE.md` and ADR numbers: the sprint lead on autopilot, the session of `/implement` by
    hand, and never both at once.

## Project-specific directives

<!-- Append rules that are true of this project and no other. Keep numbering going. -->

30. _[e.g. "All stored geometry is WGS84." / "The text in `contents` is the source of truth;
    views never own state." / "Local-only: every port binds to 127.0.0.1."]_
