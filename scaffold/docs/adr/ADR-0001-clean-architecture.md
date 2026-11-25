# ADR-0001 — Clean architecture with ports and adapters

**Date** {{YYYY-MM-DD}}
**Status** accepted

## Context

{{PROJECT_NAME}} is built largely by agents, each working one story in a fresh context with no
memory of the last — several at once when their stories are independent. That working method puts an unusual weight on structure: an agent
that cannot see the whole system has to be able to change one part of it without reading, or
breaking, the rest.

Two properties matter more here than they would on a project built by one person holding it all
in their head:

- **A blast radius that is written down.** A story must be describable as a set of paths, so it
  can be handed to an agent that has read nothing else — and so two stories whose paths do not
  overlap can be built side by side.
- **Rules a machine can check.** A convention that only lives in someone's memory does not
  survive a fresh context. A convention enforced by a failing test does.

## Decision

The codebase is layered, and dependencies point inward only:
`{{LAYER_INTERFACE}}` → `{{LAYER_APPLICATION}}` → `{{LAYER_DOMAIN}}`, and
`{{LAYER_INFRASTRUCTURE}}` → `{{LAYER_APPLICATION}}` → `{{LAYER_DOMAIN}}`.

`{{LAYER_DOMAIN}}` imports only the standard library. Every external system sits behind a port
owned by `{{LAYER_APPLICATION}}`, each port has a memory fake and a shared contract suite that
every implementation must pass, and exactly one file — `{{COMPOSITION_ROOT}}` — may import both
use cases and concrete adapters in order to wire them.

The rule is enforced by `{{ARCHITECTURE_CHECK}}`, which runs in both verify commands. If it
fails, the design is wrong, not the check.

## Consequences

**Good.** A use case can be tested with no I/O and no fixtures. An adapter can be swapped
without any use case learning about it. A story's owned paths are a real boundary rather than a
promise. The layer rule is the one architectural fact an agent cannot silently forget, because
the check remembers it.

**Bad.** There is more indirection than a small project strictly needs, and a change that
crosses layers touches more files than the equivalent change in a flat codebase. Defining a
port for something with exactly one implementation feels like ceremony at the moment you do it,
which is why prime directive 10 forbids doing it without a memory fake — the fake is what pays
for the port.

**Cost to reverse.** High once there are many use cases. Flattening the layers later means
rewriting every test that depends on a fake, so this is a decision taken at the start and kept.

## Alternatives considered

| Alternative | Why not |
| --- | --- |
| Flat structure, framework types all the way through | Fastest to start and the usual right answer for a small project — but every test then needs the framework, and an agent changing one slice can reach anything. There is no boundary to write into a story file. |
| Layers by convention, no automated check | Survives exactly as long as the person enforcing it is in the room. A fresh-context agent has no way to know the convention exists, and the first violation makes the next one cheaper. |
| Full hexagonal with a DI container and repository-per-entity | More ceremony than this project earns. The container hides the wiring that `{{COMPOSITION_ROOT}}` makes obvious, and a repository per entity multiplies ports without multiplying the external systems behind them. |
