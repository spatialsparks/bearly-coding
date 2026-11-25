---
name: sprint-review
description: Review code on demand, along two axes in two fresh contexts - one reviewer against the sprint's spec, one against the project's standards - report both side by side, and turn the findings the owner picks into stories. Autopilot runs the same review by itself before a sprint lands.
argument-hint: '[a sprint id, "since <commit or branch>", or "uncommitted" - default - the sprint in flight, else the last one landed]'
disable-model-invocation: true
---

Review code of {{PROJECT_NAME}} for me, along two axes that never mix: **Spec** — does it do
what was asked — and **Standards** — is it written the way this project writes. You do not
review it yourself: two reviewers do, each in a fresh context, and you report what they say.

What to review: $ARGUMENTS

Read: docs/ORCHESTRATION.md — move 9 and the two reviewer briefs — and docs/board/BOARD.md.
Nothing else: the reviewers read the code, not you.

1. **Pin the change**, and confirm it before you spawn anyone: the diff must not be empty.

   | I typed | The change | The spec |
   | --- | --- | --- |
   | nothing | the sprint in flight if `git branch --list "sprint/*"` shows one, else the last sprint landed: `git log --first-parent --merges -1 --format=%H main` | as below |
   | a sprint in flight, `S-012` | its story commits on the sprint branch, `git log --reverse --oneline main..<the sprint branch> --grep "(S-012\."`, each read with `git show`, at the branch's tip | its `sprint.md` |
   | a sprint that has landed | its merge commit, `git log --first-parent --merges --grep "S-012" -1 --format=%H main`: `git diff <merge>^1 <merge>`, read at `<merge>` | its `sprint.md`, in `docs/board/sprints/` or `docs/board/sprints/done/` |
   | a sprint built by hand | its story commits, `git log --reverse --oneline --grep "(S-012\."`, each read with `git show`, at HEAD. If none closes with a story's id, ask me for the range | its `sprint.md` |
   | `since <ref>` | `git diff <ref>...HEAD`, read at HEAD — check `git rev-parse <ref>` first | ask me, if no sprint is plainly meant |
   | `uncommitted` | `git diff HEAD`, written to a file outside the repository — in the system's temporary folder — and read at HEAD | ask me |

   With no spec there is no Spec reviewer: say so, and run Standards alone.
2. **Spawn both reviewers in one message**, in the foreground: `subagent_type: "reviewer"`,
   `isolation: "worktree"`, one with the Spec brief and one with the Standards brief from
   docs/ORCHESTRATION.md, each with the diff command and the commit from step 1 in place of
   the sprint branch's. For `uncommitted`, a reviewer's worktree does not hold the change: give
   each the full path of the diff file to read in place of a diff command, and say that the
   code around it is the code at HEAD.
3. **Report both, side by side**: `## Spec` and `## Standards`, each as it came, lightly
   tidied. Do not merge the two lists and do not rerank across them — a change can pass one
   axis and fail the other, and one list would hide which. Close with one line per axis: how
   many must-fix, how many for me, and the worst of each.
4. **Ask me which findings become stories.** Write each one I pick as a story in
   docs/board/inbox/, as "Where a planning session writes" in docs/PLANNING.md and
   docs/board/inbox/README.md say — **Kind** `fix` or `refactor`, owned paths from the finding,
   and as its acceptance criterion that the finding no longer holds. **Sprint** is the sprint
   reviewed if it is still in flight, so that it is fixed before the sprint lands; otherwise
   S-000. A finding I turn down for a reason that will last goes into docs/board/LATER.md,
   under "Decided against". Then commit and push the plan branch, and tell me that it waits.

Never fix anything here, and change no source file. For a sprint on autopilot the sprint lead
writes `review.md` itself when the last story is in — this command is an earlier, extra
reading, and leaves that file alone. For a sprint built by hand it is the only review there
is: offer to write the two reports into the sprint's `review.md`, on the plan branch.
