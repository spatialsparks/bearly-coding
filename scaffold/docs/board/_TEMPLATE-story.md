# S-NNN.N — Title

<!--
  Copy to docs/board/sprints/S-NNN-slug/S-NNN.N-slug.md — or, for a single story added outside a
  sprint's breakdown, to docs/board/inbox/<slug>.md with S-NNN.N left as it is (inbox/README.md).
  One story = one agent in one session = one commit. Write it BEFORE the code, so an agent that
  has read nothing else can execute it — the test of whether the story is really cold-startable.
  These headings and nothing else. Use the words of docs/GLOSSARY.md.
  Status lives in docs/board/BOARD.md only — never here.
-->

**Sprint** `S-NNN` · **Kind** _[`feat`, `fix`, `refactor` or `chore` — it becomes the type of
the story's commit]_ · **Depends on** _[story ids that must be in first, or `none`]_ ·
**Solo** _[`yes` if it changes a contract — a port, a shared type, the storage format, the
public surface of a shared module, the dependency ledger — otherwise `no`]_ ·
**Model** _[`opus`; `sonnet` only for mechanical work with no judgement in it]_

**Goal** _[one sentence: the behaviour this story makes work, as its user would see it. If it
needs an "and then", this is two stories.]_

_[Only for a bug — delete these three lines otherwise:]_
**Now** _[what happens today]_ · **Should** _[what should happen instead]_
**Reproduce** _[the one command that fails while the bug is there, and what it prints — or "not
reproduced", with what was tried]_

**Read** _[what this story actually needs, in order: in each file, the functions, types or
sections to read — not just the file, which an agent would otherwise read whole. If this list
is long, the story is too big.]_

1. `{{path}}/CLAUDE.md`
2. _[a file under `{{path}}`, and the function or section in it that matters, by name]_

**Owned paths** _[globs this story may create and edit. They are also how the sprint lead
decides what can run side by side, so list every shared file it touches: the manifest and
lockfile, the composition root, a registry, the migrations folder, a directory's CLAUDE.md.]_

- `{{path}}/**`

**Forbidden paths** _[globs it must not touch, beyond the ones every story is forbidden]_

- `docs/board/BOARD.md`, `docs/board/log/`, `docs/PROGRESS.md`, `CLAUDE.md`,
  `docs/adr/ADR-*.md` — the sprint lead owns these
- _[anything else this story has no business in]_

**Do**

1. _[three to six concrete things, in order — the test before the code it tests]_
2. _[…]_

**Verify** `{{VERIFY_FAST}}` — the sprint lead runs `{{VERIFY_COMMAND}}` once, on the whole
wave.

**Acceptance criteria** _[a list a reviewer can tick without reading the diff]_

- [ ] _[observable behaviour, not "the code is clean"]_
- [ ] _[the edge case that makes this non-trivial]_
- [ ] A test for each rule, calculation or decision added to the domain or a use case, written
      first and failing if it breaks — and no test for wiring or views (directive 14)
- [ ] _[only on the story that completes the sprint's main path: its one end-to-end test]_
- [ ] _[only for a bug: the Reproduce command passes, and a test holds it]_
- [ ] The dependency rule still holds: `{{ARCHITECTURE_CHECK}}` passes

**Done when** _[the one sentence that closes the story — an outcome someone could check
themselves]_

## History

<!-- The sprint lead only: one line per attempt that did not land — wave, what failed, what was
ruled out. A fresh agent retrying this story reads it first. -->
