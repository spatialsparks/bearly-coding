# Security

bearly-coding writes a workflow into your projects: git hooks that keep secrets out of git,
permission rules that bound what agents may do on autopilot, and a few small Node scripts. A
flaw in any of them can let a secret out or let an agent do more than it should, so reports
are very welcome.

## Reporting a vulnerability

Report it privately, through GitHub: the repository's **Security** tab, then **Report a
vulnerability**. Please do not open a public issue, a discussion or a pull request for it.

Say what is affected, how to reproduce it, and what an attacker gains. Never paste a real
secret into a report: a made-up one that matches the pattern shows the problem just as well.

This is a project I maintain myself, alongside my own work. I read every report, answer as
soon as I can, and fix confirmed problems on `main` before anything else. When a fix changes
what a project carries, the [changelog](CHANGELOG.md) says so, and `/bearly-coding:update`
brings it into existing projects.

## Supported versions

Only the latest version on `main`. There are no maintained release branches: a project gets a
fix by running `/bearly-coding:update`.

## What counts

- **The secret scan lets something through.** `scaffold/.githooks/pre-commit` or `pre-push`
  allows a commit or a push that holds a secret TruffleHog would find, or passes when
  TruffleHog is missing.
- **The permission rules leak.** An agent on autopilot can do what
  `scaffold/.claude/settings.json` denies: skip the hooks, make a repository public, push or
  deploy when it should not, or read `.env` and the vault.
- **A prompt or skill makes an agent unsafe.** A command, an agent definition or a prompt in
  this repository leads an agent to publish something, expose a secret, or act on
  instructions from a file or a web page as if they came from you.
- **The scripts reach too far.** `scripts/new-project.mjs` or `scripts/new-workspace.mjs`
  writes outside the folder it was given, or overwrites something that was already there.
- **The inspector is reachable or reads too much.** `tools/inspector/` answers anyone but this
  machine, or serves a file from outside the project.

## What does not

- Claude Code itself, or the models behind it: report those to Anthropic.
- TruffleHog itself: report that to Truffle Security.
- Code in your own project that bearly-coding did not write.
- Anything that needs someone to already control your machine or your GitHub account.
