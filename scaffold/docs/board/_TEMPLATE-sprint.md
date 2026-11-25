---
id: S-NNN
applies_to: ['{{path}}/**'] # the paths this sprint governs, so a later change there knows which spec to read
---

# S-NNN — Title

<!--
  Copy to docs/board/sprints/S-NNN-slug/sprint.md. A sprint is one outcome the owner could see
  working, and this file is its spec: what it does, not how it is built — the how is the
  stories' job.
  Written before any of its stories run, by a planning session with the owner (/feature, or
  /refactor for a technical sprint) or by the kickoff. Use the words of
  docs/GLOSSARY.md. Status lives in docs/board/BOARD.md only — never here.
  A technical sprint needs no Behaviour or States section; say "no behaviour changes" instead
  of filling them with air.
-->

**Why** _[the problem, as the person who has it would put it: what they cannot do today, or
what hurts. One to three sentences.]_

## What it delivers

_[Two or three sentences from the user's point of view. Someone who has never seen the codebase
should finish this section knowing what they would see on screen or get back from the API.]_

## Behaviour

| Given | When | Then |
| --- | --- | --- |
| _[state]_ | _[action]_ | _[observable result]_ |

_[The first row is the main path: it becomes the sprint's one end-to-end test, on the story
that completes it (directive 14). The other rows are held by domain and use-case tests.]_

## States and edge cases

_[Empty, loading, error, offline, first run, too many, too long, concurrent, permission denied.
Name the ones that apply and say what happens. The ones you do not list are the ones that will
be wrong.]_

- **Empty** — _[what is shown]_
- **Error** — _[what is shown, and what the user can do about it]_

## Rules

_[The invariants: what must always be true afterwards, whatever happened. These become the
domain tests.]_

1. _[invariant]_

## Decisions

_[What the ideation settled, a line each: the modules it touches and what changes at their
interfaces, a contract, a schema, a choice between two ways. Name things by what they are, not
by path — paths are the stories' business, and they go stale. A decision that earned an ADR
points at it. A question a prototype answered says so, with the branch's name.]_

- _[decision]_ — _[why, in a clause]_

## Testing

_[Where the behaviour is tested: the public interface the tests go through, and the tests that
already exist nearby and show how. The fewer places, the better.]_

## Acceptance criteria

_[What must hold for the sprint to be finished. Each story takes its share; the Spec reviewer
goes through this list, and everything above it, before the sprint is pushed.]_

- [ ] _[observable outcome]_

**Done when** _[the one sentence that closes the sprint]_

## Not in scope

_[The adjacent thing a reasonable person would assume is included. Saying so here is what stops
it being built, and what stops the reviewer asking for it.]_

## Open questions

_[Anything needing the owner. A story blocked by an open question stays in Backlog. Empty means
genuinely nothing, not "I guessed".]_

## Stories

An index for humans; the files in this folder are the truth.

| Story | Title | Depends on | Solo |
| --- | --- | --- | --- |
| S-NNN.1 | _[title]_ | none | yes |
