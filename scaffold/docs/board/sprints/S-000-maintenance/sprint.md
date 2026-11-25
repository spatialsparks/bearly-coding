---
id: S-000
applies_to: []
---

# S-000 — Maintenance

The standing sprint for work that is not a feature: bugs found while building, known debt being
paid down, dependency bumps, tooling. It never finishes.

Its stories follow the same rules as any other — a file, owned paths, a place in Ready, a wave,
one commit. A story comes here from the inbox (`/fix`), or from the sprint lead when an agent
reports a bug that belongs to no sprint; one that breaks something that already worked goes to
the top of Ready. A dependency bump edits the ledger, the manifest and the lockfile, so it is
always a solo story.

On autopilot, a story of this sprint is built in a free slot of the next wave and lands with
the sprint in flight; with no sprint in flight, the ready ones are a maintenance run: built,
read by the Standards reviewer, and landed like a sprint. By hand, `/implement` builds one
like any other story. When it is recorded, a finished story moves to
`docs/board/sprints/done/S-000-maintenance/`, so this folder holds what is still open.

## Stories

An index for humans; the files in this folder are the truth.

| Story | Title | Depends on | Solo |
| --- | --- | --- | --- |
