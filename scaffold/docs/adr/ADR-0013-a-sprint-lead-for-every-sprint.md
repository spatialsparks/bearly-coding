# ADR-0013 — A run that lasts for days: a sprint lead for every sprint

**Date** {{YYYY-MM-DD}}
**Status** accepted — amends ADR-0012 (the orchestrator builds nothing: it starts a sprint lead
for every sprint; a deploy that fails holds the landings and no longer ends the run), ADR-0008
(a fresh context for every sprint, without the owner typing `/clear`) and ADR-0005 (agents
report to the sprint lead that started them; they no longer message each other)

## Context

The owner wants `/autopilot` to keep working while they are away for days. ADR-0012 took the
questions out of a run: what needs the owner is set aside as an input. Three things still stood
in the way.

**One session carried the whole run.** The orchestrator planned every wave, merged every
story and ran every verify itself — 90 to 215k tokens of context per wave (ADR-0008). So its
context filled every two or three waves and was summarised, again and again, and after a few
days it was following a summary of a summary of its rules. The cure, `/clear`, is the owner's
to type.

**A prompt that nobody answers.** A command outside the allow-list makes a session ask for
permission. With the owner away the run waits on that prompt for days, looking alive and
doing nothing.

**The run ended at the wrong places.** A deploy that failed ended the whole run, though
everything but the deploy could have gone on. And after a stop for real harm — a secret found
by TruffleHog — nothing kept a new run from starting past it.

One thing needed no decision: a session that hits its plan's usage limit waits, and Claude Code
continues it by itself when the limit resets.

## Decision

- **A sprint lead for every sprint.** The orchestrator — the session `/autopilot` was typed in
  — builds nothing. It starts one sprint lead after another: a sub-agent with a fresh context
  that carries one sprint through the moves of `docs/ORCHESTRATION.md` — it plans the waves,
  starts the implementers, the verifier and the reviewers, makes one commit of each story, and
  lands the sprint — and hands back a report of a few lines. The orchestrator keeps those
  lines and nothing else, so its own context grows by a few lines per sprint. A lead hands
  back after three waves at the latest; a sprint that is not finished by then gets a fresh
  lead, which finds on the board and in git where the last one got to. Two leads in a row
  that change nothing end the run.
- **Nobody asks.** The sprint lead and every agent it starts run in the permission mode
  `dontAsk`, set in their definitions: a command the settings do not allow is refused at once.
  The agent does the step another way, or reports the refusal; a story that cannot be done
  without the command is blocked, with an input that names it, and allowing it is the owner's.
  For that to work, editing files inside the project is on the allow-list. The owner's own
  sessions keep asking.
- **A stop is a stop.** Where going on could do harm, a lead writes an input of kind `stop`
  and hands back. While that input is open, no run starts and no lead builds.
- **A deploy that fails holds; it does not end.** It is run once more. If it fails again, the
  sprint stays on `main`, an input holds every further landing, and building goes on: what is
  finished meanwhile stays `reviewed` on its branch until the owner has answered and the
  deploy has passed.
- **After a summary, the rules are read again.** A hook in `.claude/settings.json` fires when
  Claude Code has summarised a session's context, and tells it to read its command and the
  protocol again instead of going on from the summary.
- **Agents report; they do not message.** An agent's sprint lead is not the main session, so a
  message "to main" would reach the one agent that reads nothing. What the board should know
  goes into the agent's report, under **Found**.
- **On and off is the session.** Typing `/autopilot` turns it on; stopping that session turns
  it off. Nothing is scheduled, nothing keeps running, and nothing starts by itself later.

## Consequences

**Good.** A run is no longer as long as one context: each sprint is built in a context that
has never seen another. The owner does not have to come back to type `/clear`. A missing
permission costs one story, not the run. A flaky deploy costs nothing but the deploy. What
stopped a run for good reason keeps it stopped. And autopilot is still a thing the owner can
see and stop: one session, with one agent under it.

**Bad.** The allow-list now decides what an agent can do at all: a command nobody thought to
allow blocks a story, where a person at the keyboard would have clicked yes. With edits
allowed, the owner's own sessions no longer ask before changing a file in the project either.
A sprint's wave plans are no longer announced in the session: the inspector shows them. Agents
cannot warn each other while they work. A reboot, a closed app or a sleeping machine still
ends a run; the owner types `/autopilot` again and it carries on from the board. And the whole
of it rests on how Claude Code treats sub-agents — that one may start agents of its own, and
that its own permission mode holds when the session is in Manual mode — which a new version
can change.

**Cost to reverse.** Low. One agent definition, one command, a section of
`docs/ORCHESTRATION.md`, a line in each agent's definition and two rules in the settings.

## Alternatives considered

| Alternative | Why not |
| --- | --- |
| A scheduled task that starts a fresh run every hour | It covers a reboot as well, but it is a standing schedule for the whole project: on until someone disables it, starting sessions nobody is watching, and not tied to any session the owner can stop. The owner found that too much. |
| One session that compacts as it goes, with `/clear` between runs | What ADR-0008 had. It needs the owner, or it trusts a summary of a summary. |
| A sprint lead for every wave | The smallest contexts, but three or four cold starts per sprint, each reading the protocol and the board again. Handing back after three waves bounds a lead's context at a lower price. |
| A separate headless Claude Code process per sprint | A fresh context and no nesting, but nothing to watch or stop in the app, and it needs the command line signed in and the folder trusted. |
| Leaving the permission mode to the session the owner starts | "Accept edits" still asks before a command, and a prompt nobody answers holds the run. An agent that never asks fails one story instead. |
| A deploy that fails ends the run, as ADR-0012 had it | Days of building lost to an expired login. |
