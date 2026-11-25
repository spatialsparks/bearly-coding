---
updated: 2026-03-02
updated_by: sprint 6
status: needs-owner # on-track | blocked | needs-owner
---

# Progress

> The hand-off file.

## Where we are

Maps open, save and reload. Layers can be switched on and off, and reordering them is in
sprint 7.

Sharing is not built yet.

## Blocked on the owner

- A mail provider for share links: pick one, then add its key as `MAIL_KEY`
  in the repository's secrets.
- A billing account for the tile host.

## Known debt

- The tile cache is rebuilt on every start → T-000.4
