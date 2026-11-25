# Architecture

The authoritative description of how this codebase is shaped. **This file wins over `KICKOFF.md`
wherever the two differ** — when reality diverges from the original brief, the divergence and
its reason are recorded here (prime directive 22).

## The layers

```
        {{LAYER_INTERFACE}}                 {{LAYER_INFRASTRUCTURE}}
       (delivery: routes,               (adapters: db, http clients,
        handlers, CLI, views)            file store, SDKs, clock)
                 |                                 |
                 +----------------+----------------+
                                  |
                          {{LAYER_APPLICATION}}
                     (use cases + the ports they need)
                                  |
                           {{LAYER_DOMAIN}}
                  (entities, value objects, pure rules)
```

Arrows point the way imports are allowed to go: **inward only**.

| Layer | Path | May import | Must not import |
| --- | --- | --- | --- |
| `{{LAYER_DOMAIN}}` | `{{PATH_DOMAIN}}` | the standard library | everything else |
| `{{LAYER_APPLICATION}}` | `{{PATH_APPLICATION}}` | `{{LAYER_DOMAIN}}`, its own ports | `{{LAYER_INFRASTRUCTURE}}`, `{{LAYER_INTERFACE}}`, frameworks |
| `{{LAYER_INFRASTRUCTURE}}` | `{{PATH_INFRASTRUCTURE}}` | `{{LAYER_APPLICATION}}`, `{{LAYER_DOMAIN}}`, anything external | `{{LAYER_INTERFACE}}` |
| `{{LAYER_INTERFACE}}` | `{{PATH_INTERFACE}}` | `{{LAYER_APPLICATION}}`, `{{LAYER_DOMAIN}}` | `{{LAYER_INFRASTRUCTURE}}` |

The one exception is **`{{COMPOSITION_ROOT}}`**, the single file allowed to import both use
cases and concrete adapters, because something has to wire them together. Nothing else may.

## The dependency rule, enforced

**`{{ARCHITECTURE_CHECK}}`** runs inside `{{VERIFY_FAST}}`, and so inside `{{VERIFY_COMMAND}}`:
a violation fails the story's own gate rather than waiting for a reviewer to notice. If it
fails, the design is wrong, not the check. Its rules:

| Rule | Says |
| --- | --- |
| domain is pure | `{{PATH_DOMAIN}}` imports only the standard library |
| application imports inward | `{{PATH_APPLICATION}}` imports only the domain and its own ports |
| adapters stay out of the interface | `{{PATH_INFRASTRUCTURE}}` never imports `{{PATH_INTERFACE}}` |
| only the root composes | nothing but `{{COMPOSITION_ROOT}}` names a concrete adapter |
| slices stay slices | a slice never imports another slice |
| no cycles | a cycle means the two modules are one and the boundary between them is fiction |
| nothing unresolvable | an import that resolves to nothing is a typo, and it slips past every rule above |
| no dev dependency in shipped code | a dev-only package imported by shipped code is missing in production |

**Every rule is proved.** An architecture test in `{{PATH_TESTS}}/` writes one deliberately
illegal module per rule, runs the check against it, asserts that exactly that rule reports it,
and deletes the fixture. A rule with a typo in its path pattern, or a resolver that silently
cannot follow the workspace, matches nothing and passes forever; the proof is what catches
it. A new rule lands together with its proof (directive 9).

## Ports and adapters

A **port** is an interface owned by `{{LAYER_APPLICATION}}`, named for what the application
needs rather than for what implements it — `ScenarioStore`, not `PostgresRepository`. A use
case receives ports through its constructor and never knows which implementation it got.

Every port ships with:

1. a **memory fake** — a real, working in-memory implementation, not a mock;
2. a **contract test suite**, exported as a function taking a factory, that every
   implementation of the port must pass. The real implementation runs it against a local
   emulator, container or instance, inside `{{VERIFY_COMMAND}}` — never against a cloud
   project, so neither a verify nor a fresh clone needs a credential to prove an adapter works.

```
{{PATH_APPLICATION}}/ports/<name>.{{EXT}}        the interface
{{PATH_INFRASTRUCTURE}}/memory/<name>.{{EXT}}    the fake
{{PATH_INFRASTRUCTURE}}/<real>/<name>.{{EXT}}    the real one
{{PATH_TESTS}}/contracts/<name>_contract.{{EXT}} the suite both run
```

A port with one implementation and no fake is not a port; it is indirection, and prime
directive 10 says do not add it.

## Use cases

One use case, one public entry point (prime directive 6). A use case:

- takes its dependencies as port types in the constructor;
- takes a request value and returns a result value, both defined in `{{LAYER_DOMAIN}}` or
  beside the use case;
- contains the orchestration, not the rules — the rules live in `{{LAYER_DOMAIN}}` where they
  can be tested without any of this.

## Slices

`{{PATH_INTERFACE}}` is organized by feature, not by technical kind. A slice owns its own
views, its own use-case calls and its own local types. **Slices never import each other's
internals.** Anything two slices need moves down into `{{LAYER_DOMAIN}}` or into a shared
primitives module — never sideways, and never through a barrel file that re-exports someone
else's guts.

## How to add a …

**…use case.** Define or reuse the ports it needs in `{{PATH_APPLICATION}}/ports/`. Write the
use case with one entry point. Unit-test it against the memory fakes. Register it in
`{{COMPOSITION_ROOT}}`. No adapter changes unless a port is genuinely missing something.

**…adapter.** Implement an existing port. Run the port's contract suite against it — that is
the definition of "it works". Wire it in `{{COMPOSITION_ROOT}}` behind whatever configuration
selects it. Nothing outside `{{PATH_INFRASTRUCTURE}}` and the composition root learns its name.

**…slice.** New directory under `{{PATH_INTERFACE}}`, with its own `CLAUDE.md`. It talks to use
cases only. If it needs something another slice has, that thing moves down first.

**…external dependency.** A row in the ledger of `docs/adr/ADR-0003-dependencies.md` saying
why nothing installed sufficed, an exact version, the lockfile committed, and — if it runs an
install script — an entry in the allowlist that permits it. If it is an SDK or a client, it goes behind a port; it
does not get imported from `{{LAYER_APPLICATION}}` or `{{LAYER_DOMAIN}}`.

## Extension points

Where the same kind of thing gets added over and over — a document type, a report format, an
import source, a rule, a command — it becomes a **registry**, not a `switch`. One entry per
kind, declared in one place, with everything that varies in the entry:

```
registry = { kind: { schema, handler, label, default } , … }
```

Adding the tenth kind is then one entry and one test, touching no existing code, and the list
of what exists is readable in one file. A `switch` that grows a case per kind has the opposite
property: every addition edits shared code, so every addition is a chance to break the other
nine — and for an agent working from a story file, an edit to shared code is exactly what owned
paths are meant to prevent.

Three rules keep a registry from becoming a plugin framework, which is a project of its own:

1. **Build-time, not runtime.** Entries are declared in source and type-checked. Nothing is
   loaded from disk or the network at runtime.
2. **The registry lives in `{{LAYER_DOMAIN}}` or `{{LAYER_APPLICATION}}`**; entries may carry a
   lazily-imported view or adapter, but the registry itself stays inside the dependency rule.
3. **One registry per axis of variation, added when the third case appears** — not on the first
   one, which YAGNI forbids, and not on the tenth, by which time the `switch` is load-bearing.

## Configuration

Read in exactly one place — `{{COMPOSITION_ROOT}}` — and passed inward as values. No use case,
entity or view reads an environment variable. Secrets come from the environment at runtime and
are never written into the repository (prime directive 16, and `docs/SECRETS.md`).

## Demo mode

`{{COMPOSITION_ROOT}}` has one switch — a query parameter, a flag, an environment value — that
builds every port from its memory fake instead of the real adapter: no network, no account, no
cloud project. Nothing but the composition root reads the switch; the rest of the app cannot
tell the difference, which is the point.

It pays three times. The end-to-end tests run the composed app this way, so they need no
credentials. Anyone can try the product without signing up. And a view that cannot render on
the fakes is a view that reaches past a port.

## Persisted formats

Anything the project stores or exchanges — a document schema, a file layout, a wire format — is
specified in `docs/STORAGE_FORMAT.md`, carries a version, and is proved by golden corpora:
input files compared byte for byte after a round trip. A change needs a version bump, a
migration note and an ADR (directive 27). The corpora are never reformatted, so the formatter
ignores them. A project that persists nothing deletes `docs/STORAGE_FORMAT.md`.

## Testing shape

| Kind | Lives in | Depends on |
| --- | --- | --- |
| Domain unit tests | beside the domain code | nothing, no I/O, no fixtures |
| Use-case tests | beside the use case | memory fakes only |
| Contract tests | `{{PATH_TESTS}}/contracts/` | run once per implementation of a port, the real one against a local emulator |
| Format corpora | `{{PATH_TESTS}}/` | golden files, compared byte for byte |
| Architecture test | `{{PATH_TESTS}}/` | the import graph, plus one illegal fixture per rule |
| End-to-end | `{{PATH_TESTS}}/e2e/` | the composed app in demo mode — one test per sprint, of its main path |

What gets a test and what does not is directive 14, spelled out in `docs/AGENT_WORKFLOW.md`:
the logic in the domain and the use cases, every port's contract, one end-to-end path per
sprint, each written before its code — and nothing of its own for wiring, pass-through adapter
code, views or configuration.

## Divergences from the original brief

<!-- Append-only within this section. Each entry: what changed, when, why, and the ADR. -->

_[Nothing yet.]_
