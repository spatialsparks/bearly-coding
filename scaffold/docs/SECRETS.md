# Secrets

**Nothing in this file is a secret.** It names secrets and says where they live. It never
contains a value. If you are about to paste a value in here, stop — that is the mistake this
file exists to prevent.

## The rules

1. **No secret ever reaches the repository.** No key, token, password, connection string,
   service-account file or `.env` in a commit, a test fixture, a doc, a screenshot or a commit
   message.
2. **TruffleHog checks every commit and every push** — the git hooks in `.githooks/`, switched
   on by `git config core.hooksPath .githooks` once per clone (ADR-0009). The pre-commit hook
   scans every file the commit adds or changes, as it is staged; the pre-push hook scans every
   commit the push would send — the files it adds or changes, and its message. Both hand
   TruffleHog the files themselves: its own git scan sees nothing of `git commit -a`, and
   stops without a word at a `.pdf`, `.docx` or `.rtf` under Git for Windows. Both fail
   closed: without `trufflehog` on the PATH, nothing is committed or pushed. Never
   `--no-verify`. `sh .githooks/pre-push --all` scans the whole history of a branch by hand.
   A line that holds a deliberate fake — a made-up password in a test — ends with the comment
   `trufflehog:ignore`, and nothing else ever gets that comment; a fake it reports all the
   same is put together from two strings in the test. Install TruffleHog once per
   machine — `brew install trufflehog` on macOS, elsewhere the binary for the platform from
   the TruffleHog releases page on GitHub, on the PATH.
   Nothing is read from GitHub repository secrets: there is no CI to read them. The deploy
   reads what it needs from the local `.env`, or from the host's own login on this machine.
3. **Every secret also has a copy in the vault**, so keeping it out of git never means losing
   it. The vault for this project is:

   ```
   {{SECRETS_VAULT}}
   ```

   Confirmed with the owner on {{YYYY-MM-DD}}. It is outside the repository and is never
   committed, synced into it, or referenced by a relative path from it.

4. **An agent asks before creating a secret and before writing one to the vault.** It never
   invents a vault path, never echoes a real value back into the chat, and never writes one
   into a file other than the local `.env` and the vault copy.
5. **Rotating a secret updates three places**: the live system, the local `.env` (or the
   host's settings, where the host holds it), and the vault copy. A rotation that updates two
   of three is the outage you get in a month.
6. **Agents' worktrees get no secrets.** Never list `.env` or a key file in a
   `.worktreeinclude`: the verify commands need no credentials (`docs/ARCHITECTURE.md`), so an
   agent has no reason to hold one, and every copy of a secret is one more place it can leak
   from.

## What is *not* a secret

Public configuration that only identifies the project belongs in the repository — a client-side
project id, a public web API key meant to ship in a browser bundle, a region name, a public
hosting URL. Say so explicitly below, so nobody has to guess and nobody "helpfully" moves it.

| Not secret | Why |
| --- | --- |
| _[e.g. `FIREBASE_API_KEY` (web)]_ | _[ships in the client bundle; access is controlled by security rules, not by this key]_ |

## Inventory

| Name | What it is for | Set in | Vault copy | Rotated |
| --- | --- | --- | --- | --- |
| `{{SECRET_NAME}}` | _[what it unlocks]_ | local `.env` · {{HOSTING}} | yes | {{YYYY-MM-DD}} |

## Local development

`.env` is git-ignored and holds real values. `.env.example` is committed and holds placeholders
with the same keys, so a fresh clone can see what it needs without learning anything it should
not. Keep the two key sets identical — a key that exists only in someone's `.env` is a key the
next session will not know to ask for.

## If a secret is exposed

1. **Rotate it first** if it was pushed. Revoking and reissuing is the fix; removing the
   commit is cleanup. A secret the pre-push hook stopped never left the machine: the owner
   decides whether it is rotated.
2. Remove it from the history and tell the owner — even if the repository is private, even if
   it was only for a minute. Rewriting a pushed history needs the owner, because it needs a
   force push, which no session may make.
3. Update the vault copy and the local `.env` with the new value.
4. Write down in `docs/PROGRESS.md` under "Known limitations" how it got in, so the next
   session does not repeat the route.
