# Changelog

What changed in the template, newest first. `/bearly-coding:update` reads this before it
compares a project with the template, so each entry says what a project gains and what it has
to do about it.

## 2026-11-25 — first version

Everything a project made with `/bearly-coding:new` starts with:

- **The board**: sprints as folders, stories as files, waves in a log, and what waits on the
  owner as input files.
- **Thirteen commands in the project**, and `/kickoff` until Phase 0 has run: `/ideate`,
  `/feature`, `/fix`, `/refactor`, `/implement`, `/autopilot`, `/resolve`, `/sprint-review`,
  `/project-review`, `/retro`, `/stack-skills`, `/standup` and `/board`.
- **Six agents**: a sprint lead, implementers, a verifier, reviewers and an architect for
  autopilot, and a skill writer for the stack's skills.
- **Stack skills written by the project** (ADR-0014): one skill writer per part of the stack,
  from that part's own documentation.
- **Two vendored tools on Node 20 or newer**: the board page in `tools/inspector/` and
  `tools/context-report.mjs`.
- **TruffleHog in the git hooks**, and GitHub used for version control only.
- **`.claude/bearly.json`**, which says which workflow library made the project, so one
  library's update command never converts another's project.
