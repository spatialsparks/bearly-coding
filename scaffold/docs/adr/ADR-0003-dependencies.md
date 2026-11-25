# ADR-0003 — The dependency ledger

**Date** {{YYYY-MM-DD}}
**Status** accepted — the ledger below is living; add a row with every dependency

## Context

Every dependency is code nobody on this project wrote, a supply-chain risk, and a future
upgrade. An agent adding one in the middle of a step has every incentive to reach for a package
and no incentive to ask whether the platform or something already installed would do.
Justifications scattered across many ADRs cannot be reviewed as a whole.

## Decision

One ledger, here. Every runtime and tooling dependency gets one row saying why nothing already
installed sufficed (directive 11). A pull request that adds a dependency adds its row, and a
reviewer can diff the table.

Around the ledger, the toolchain enforces the rest:

- **Exact versions.** The package manager is configured to save exact versions (pnpm and npm:
  `save-prefix=` in `.npmrc`), the lockfile is committed, and every install is frozen.
- **Install scripts by allowlist.** A dependency may run code at install time only if it is
  named in an allowlist (pnpm: `allowBuilds` in `pnpm-workspace.yaml`), after someone read what
  the script does.
- **A pinned runtime.** The language runtime's version lives in the repository and the
  toolchain supplies it (pnpm: `devEngines.runtime` with `onFail: download`, plus
  `.node-version` for any tool that reads it; uv: `.python-version`), so no command depends on what happens to be
  on `PATH`.

| Package | Version | Why nothing already here sufficed |
| --- | --- | --- |
| _[package]_ | _[exact version]_ | _[one line]_ |

## Consequences

**Good.** The dependency surface is one readable table. Upgrades are deliberate, reproducible
and reviewable. A compromised package cannot run code at install time unless someone allowed it.

**Bad.** Exact pins do not update themselves: without a dependency bot, versions rot and
security fixes are missed. Adding a package costs a sentence of justification, on purpose.

**Cost to reverse.** Low — delete the ledger. Nobody will want to.

## Alternatives considered

| Alternative | Why not |
| --- | --- |
| One line of justification in whichever ADR is nearest | The template's first version did this. The justifications were impossible to review as a set, and nothing told you where to look. |
| Version ranges and a lockfile | The lockfile pins what was installed, but the next `add` can silently resolve newer versions of everything else. Exact versions make every change a visible diff. |
