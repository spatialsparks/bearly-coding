# Directory CLAUDE.md template

Copy this into every source directory as `CLAUDE.md`. It has no line limit: keep it as precise
and short as possible, with only what is necessary. Claude Code attaches the whole file to every
file read in that directory, which is exactly when it is useful.

Purpose, public API, invariants, test command, gotchas. Nothing else — no tutorials, no
history, no restating the prime directives.

---

```md
# {{directory name}}

{{One sentence: what lives here and what does not.}}

## Public API

What the rest of the codebase may import from here. Everything else is internal, whatever the
language lets you reach.

- `thing` — what it is for
- `otherThing` — what it is for

## Invariants

The two or three things that must stay true. The ones that, if broken, cause a bug somewhere
else entirely.

1. …

## May import

{{the layers this directory is allowed to depend on}}

## Must not import

{{the layers it must not — restate the ones that actually apply here, not all of them}}

## Test

`{{the command that tests just this directory}}`

## Gotchas

The thing that cost someone an hour. Delete it once it stops being true.

- …
```
