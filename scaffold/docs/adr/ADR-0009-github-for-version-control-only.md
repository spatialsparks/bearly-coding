# ADR-0009 — GitHub for version control only: everything runs on this machine

**Date** {{YYYY-MM-DD}}
**Status** accepted — amends ADR-0005 (a sprint lands as a local squash commit, not a pull
request) and ADR-0007 (the secret scan moves from CI into git hooks; nothing runs in CI)

## Context

ADR-0007 took the tests out of CI and left it two jobs: a TruffleHog secret scan on every pull
request and every push to `main`, the one required check of the branch protection, and the
deploy from `main`. Everything else already ran locally — the fast verify in every task, the
full verify once per sprint.

What was left still cost Actions minutes on every sprint and every planning session's pull
request, each run rounded up to a whole minute; branch protection on a private repository
needs a paid plan; and the scan found a secret only after it had been pushed, when the only fix
is to rotate it. The owner decided that GitHub should hold the repository and nothing else,
in every project, unless a project's kickoff says otherwise.

## Decision

- **No GitHub Actions, no pull requests, no branch protection, no Dependabot** — by default.
  GitHub is the remote: pushes, pulls, branches as backups.
- **The secret scan runs in git hooks.** `.githooks/pre-commit` runs TruffleHog on what is
  staged, so a secret never becomes a commit; `.githooks/pre-push` runs it on every commit a
  push would send, so nothing leaves the machine unscanned. Both fail closed: without
  `trufflehog` on the PATH nothing is committed or pushed. `core.hooksPath` points at
  `.githooks/`, so every worktree — every agent — runs them. Agents are denied `--no-verify`.
  Phase 0 scans the whole history once.
- **A sprint lands as one squash commit on `main`**, made by the orchestrator in the main
  checkout and pushed fast-forward — after the full verify and the verifier, exactly where the
  pull request used to merge. The `sprint/NN` branch, pushed when the sprint is planned, is the
  lock that a draft pull request was.
- **Planning sessions do not write `main`.** `/feature`, `/refactor` and `/task` commit on a
  `story/` or `card/` branch and push it as a backup; the orchestrator merges each into `main`
  when it plans the next sprint. `main` has one writer.
- **The orchestrator deploys**, if the project deploys: `{{DEPLOY_COMMAND}}` from `main` just
  after a sprint has landed, the step a CI deploy job used to take. Implementers, verifiers,
  architects and planning sessions stay denied it.
- **More of GitHub is a decision of the kickoff.** `/ideate` asks how much GitHub the project
  should use; anything beyond version control — pull requests, a deploy from Actions — is
  recorded as an ADR, and `docs/ORCHESTRATION.md` lists exactly which moves it changes.

## Consequences

**Good.** No Actions minutes and no paid plan. A secret is stopped before it is committed, not
found after it was pushed. Landing a sprint waits on nothing remote: no queued runner, no
required check. The protocol works the same with no network until the push.

**Bad.** Nothing on the server enforces anything. The hooks are a client-side gate: a clone
without `core.hooksPath`, a machine without `trufflehog`, or a `--no-verify` the deny list does
not catch, skips them — the full-history scan in Phase 0 and in each template update is the
check on that. There are no previews per pull request, and no pull request page to read a
sprint on: the sprint log and the squash commit are the record. A dependency update is a card
someone writes, not a pull request a bot opens. A deploy depends on the owner's machine being
set up for it.

**Cost to reverse.** Low, per piece: put back a `secret-scan` workflow and its required check,
or open a pull request in move 3 and merge it in move 7 — `docs/ORCHESTRATION.md`, "Using more
of GitHub", says which lines change.

## Alternatives considered

| Alternative | Why not |
| --- | --- |
| Keep the secret scan in CI as a backstop | About a minute per pull request and per push to `main`, and it finds a secret only after it has left the machine. The pre-push hook covers the same commits before they leave. |
| ggshield (GitGuardian) | Needs an account and an API key, sends what it scans to GitGuardian's service, and has a monthly quota that parallel agents use up. TruffleHog needs no account and contacts nothing but the service that issued a finding, to check whether it is live. |
| A pre-push hook alone | A secret could then sit in a local commit, and every agent's history would have to be rewritten to get it out before the push. The pre-commit hook costs about a second per commit. |
| Keep one pull request per sprint, without CI | A page to read each sprint on — but the sprint log already is that record, and a pull request is GitHub doing more than version control. Available per project (`docs/ORCHESTRATION.md`, "Using more of GitHub"). |
