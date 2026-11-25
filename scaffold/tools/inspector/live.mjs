// Where each story stands right now. The board says which stories are in the wave and in what
// order; it is only rewritten when a wave is planned and when it is recorded. In between, git
// knows more: Claude Code locks a worktree while its agent runs, the sprint branch holds one
// commit per finished story with the story's id in its subject, and the verifier and the
// reviewers check the sprint out detached at its tip.
//
// A board from before ADR-0011 is read too: there a task branch was merged into a numbered
// sprint branch, and a merged branch is an ancestor of it.

import { sprintOf } from './board.mjs';

const IN_REVIEW = new Set(['checking', 'checked', 'handed-back', 'merged', 'committed']);
// A sprint's folder is in docs/board/sprints/, or in sprints/done/ once it has had its retro.
// Before ADR-0011 the folders stood in docs/board/ itself.
const STORY_FILE = /^docs\/board\/(?:sprints\/)?(?:done\/)?[^/]+\/((?:S|T)-\d+\.\d+)[^/]*\.md$/;
const SPRINT_FILE = /^docs\/board\/(?:sprints\/)?((?:S|ST)-\d+)([^/]*)\/(?:sprint|story)\.md$/;
const ARCHIVED = /^docs\/board\/(?:sprints\/)?done\//;
const WORK = ['story', 'task']; // an implementer's branch, today and before

/** The sprint branch in flight: the one the board names, else the one checked out, else the only one. */
export function sprintBranch(git, meta) {
  if (!git) return null;
  const named =
    git.branches.find((b) => meta.currentSprint && b.name === `sprint/${meta.currentSprint}`) ??
    git.branches.find((b) => /^sprint\/\d+$/.test(b.name) && Number(b.name.slice(7)) === meta.currentWave);
  if (named) return named.name;
  const checkedOut = git.worktrees.find((w) => w.main && /^sprint\//.test(w.branch));
  if (checkedOut) return checkedOut.branch;
  // A sprint's branch is its lock: while it exists, the sprint is in flight, wherever HEAD is.
  const lone = git.branches.filter((b) => /^sprint\/S-\d+$/.test(b.name));
  return lone.length === 1 ? lone[0].name : null;
}

/** A story's state from git where git can tell, from the board's State column where it cannot. */
export function liveState(row, git, sprint) {
  const declared = row.state || 'building';
  const fromBoard = { state: declared, source: 'board', running: false, detail: '' };
  const branch =
    git?.branches.find((b) => b.name === row.branch) ??
    git?.branches.find((b) => WORK.some((kind) => b.name === `${kind}/${row.id}` || b.name.startsWith(`${kind}/${row.id}-`)));
  const tip = sprint ? git?.branches.find((b) => b.name === sprint)?.head : null;
  // Whoever reads the sprint at its tip - the verifier, a reviewer - reads every story in it.
  const reading = Boolean(tip) && git.worktrees.some((w) => w.detached && w.locked && w.head === tip);

  // The sprint branch holds the story's commit: it is in, whatever became of its own branch.
  if (sprint && (git?.landed?.[sprint] ?? []).includes(row.id)) {
    const base = { source: 'git', running: reading, branch: branch?.name ?? '', commits: 1, time: branch?.time ?? null };
    return reading ? { ...base, state: 'checking', detail: `in ${sprint}` } : { ...base, state: 'committed', detail: `on ${sprint}` };
  }
  // Without the branch, or with a git too old to count its commits, the board is all there is.
  if (!branch || branch.ahead === null) return fromBoard;

  const base = { source: 'git', running: false, branch: branch.name, commits: branch.ahead, time: branch.time };
  // A branch that has no commits of its own is an ancestor of everything: only work counts.
  const hasWork = branch.ahead > 0;
  if (hasWork && sprint && (git.merged?.[sprint] ?? []).includes(branch.name)) {
    if (reading) return { ...base, state: 'checking', running: true, detail: `in ${sprint}` };
    return { ...base, state: 'merged', detail: `into ${sprint}` };
  }
  // A failed or blocked story is the orchestrator's verdict; nothing in git records it.
  if (declared === 'returned' || declared === 'blocked') return { ...fromBoard, ...base, source: 'board' };

  const own = git.worktrees.find((w) => w.branch === branch.name);
  const verifier = hasWork ? git.worktrees.find((w) => w.detached && w.head === branch.head) : null;
  if (verifier?.locked) return { ...base, state: 'checking', running: true, detail: '' };
  if (own?.locked) return { ...base, state: 'building', running: true, detail: 'agent running' };
  if (own?.main) return { ...base, state: 'building', running: true, detail: 'in the main checkout' };
  if (verifier) return { ...base, state: 'checked', detail: '' };
  if (hasWork) return { ...base, state: 'handed-back', detail: 'awaiting its check' };
  return { ...base, state: 'building', detail: own ? 'starting' : 'not started' };
}

const words = (slugged) => {
  const text = slugged.replace(/^-+/, '').replace(/-/g, ' ').trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
};

/** Story files by id: `docs/board/sprints/S-012-share-links/S-012.1-share-port.md`, in `done/` too. */
export function storyFiles(paths) {
  const found = new Map();
  for (const path of paths) {
    const story = STORY_FILE.exec(path);
    if (story) found.set(story[1], path);
  }
  return found;
}

/** The four columns: waiting, in progress, in review, done. */
export function columns({ board, log, paths, git }) {
  const files = storyFiles(paths);
  const archived = [...files].filter(([, path]) => ARCHIVED.test(path)).map(([id]) => id);
  const logged = log.entries.flatMap((entry) => entry.stories.filter((s) => s.ok).map((s) => s.id));
  const doneIds = new Set([...board.done.map((row) => row.id), ...logged, ...archived]);
  const closed = new Set(board.sprints.filter((s) => ['done', 'landed', 'built'].includes(s.status)).flatMap((s) => s.ids));
  const known = new Set(board.sprints.flatMap((s) => s.ids));
  const sprint = sprintBranch(git, board.meta);

  // Whatever exists in the repository but that the orchestrator has not listed yet.
  const open = [...board.inWave, ...board.ready, ...board.blocked, ...board.backlog];
  const listed = new Set([...open, ...board.done].map((row) => row.id));
  const fresh = (id, title, file, note) => ({ id, title, file, note, lane: 'unlisted', parent: sprintOf(id), deps: [] });
  const unlisted = [];
  for (const [id, path] of files) {
    if (listed.has(id) || doneIds.has(id) || closed.has(sprintOf(id))) continue;
    const kind = id.startsWith('T-') ? 'card' : 'story';
    unlisted.push(fresh(id, words(path.replace(/^.*\/(?:S|T)-\d+\.\d+/, '').replace(/\.md$/, '')), path, `${kind} not on the board yet`));
  }
  for (const path of paths) {
    const inbox = /^docs\/board\/inbox\/(?!README\.md$)([^/]+)\.md$/.exec(path);
    if (inbox) unlisted.push(fresh('', words(inbox[1]), path, 'in the inbox'));
    const folder = SPRINT_FILE.exec(path);
    if (folder && !known.has(folder[1])) {
      const kind = folder[1].startsWith('ST-') ? 'story' : 'sprint';
      unlisted.push(fresh(folder[1], words(folder[2]), path, `${kind} not on the board yet`));
    }
  }
  for (const branch of git?.branches ?? []) {
    // plan/S-013-due-dates, plan/fix-zoom - and story/ST-105-export, card/fix-zoom before ADR-0011.
    const planned = /^plan\/(?:(S-\d+)(?=-|$))?(.*)$/.exec(branch.name) ?? /^(?:story\/(ST-\d+)|card\/)(.*)$/.exec(branch.name);
    if (!planned) continue;
    const id = planned[1] ?? '';
    const slug = planned[2].replace(/^-+/, '');
    const seen = id ? known.has(id) || unlisted.some((item) => item.id === id) : unlisted.some((item) => item.file?.endsWith(`/${slug}.md`));
    if (!seen) unlisted.push(fresh(id, words(slug), null, `being planned on ${branch.name}`));
  }

  // A story is done when the board, the log or `done/` says so - or when it has a file and
  // nothing lists it as open: the log's older files are not loaded, and need not be.
  const pending = new Set([...open, ...unlisted].map((row) => row.id));
  const settled = new Set([...doneIds, ...[...files.keys()].filter((id) => !pending.has(id))]);
  const card = (row, lane, extra = {}) => ({
    ...row,
    lane,
    parent: sprintOf(row.id),
    file: files.get(row.id) ?? null,
    deps: row.dependsOn.map((id) => ({ id, done: settled.has(id) })),
    ...extra,
  });

  const progress = [];
  const review = [];
  const blocked = board.blocked.map((row) => card(row, 'blocked'));
  for (const row of board.inWave) {
    const live = liveState(row, git, sprint);
    const item = card(row, 'wave', { live });
    if (live.state === 'blocked') blocked.push(item);
    else (IN_REVIEW.has(live.state) ? review : progress).push(item);
  }

  return {
    sprint,
    waiting: {
      ready: board.ready.map((row) => card(row, 'ready')),
      blocked,
      backlog: board.backlog.map((row) => card(row, 'backlog')),
      unlisted,
    },
    progress,
    review,
    done: board.done.map((row) => card(row, 'done')),
    doneOlder: Math.max(0, settled.size - board.done.length),
  };
}
