import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { parseBoard, parseSprintLog, parseWave } from '../../scaffold/tools/inspector/board.mjs';
import { columns, liveState, sprintBranch, storyFiles } from '../../scaffold/tools/inspector/live.mjs';

const fixture = (name) => readFileSync(new URL(`../fixtures/drifted/${name}`, import.meta.url), 'utf8');
const today = (name) => readFileSync(new URL(`../fixtures/sprints/${name}`, import.meta.url), 'utf8');

const branch = (name, ahead, head = name) => ({ name, head, ahead, behind: 0, time: 1_700_000_000, subject: '' });
const worktree = (over) => ({ path: '', head: '', branch: '', detached: false, locked: false, main: false, ...over });

// --- Today: a story on story/S-…, one commit per story on sprint/S-… (ADR-0011) ---------------

const story = (id, state = 'building') => ({ id, state, branch: `story/${id}-x` });
const flight = (over) => ({
  defaultBranch: 'main',
  worktrees: [worktree({ main: true, branch: 'sprint/S-004', head: 'sprint-tip' })],
  branches: [branch('sprint/S-004', 4, 'sprint-tip')],
  merged: { 'sprint/S-004': [] },
  landed: { 'sprint/S-004': [] },
  ...over,
});

test('the sprint in flight is the one the board names, else the one checked out, else the only one', () => {
  const repo = flight({});
  assert.equal(sprintBranch(repo, { currentSprint: 'S-004', currentWave: 12 }), 'sprint/S-004');
  assert.equal(sprintBranch(repo, { currentSprint: null, currentWave: null }), 'sprint/S-004');
  // the orchestrator is on main for a moment, merging a plan: the branch is still the lock
  const away = flight({ worktrees: [worktree({ main: true, branch: 'main' })] });
  assert.equal(sprintBranch(away, { currentSprint: null, currentWave: null }), 'sprint/S-004');
  assert.equal(sprintBranch(flight({ worktrees: [worktree({ main: true, branch: 'main' })], branches: [] }), { currentSprint: null, currentWave: null }), null);
  assert.equal(sprintBranch(null, { currentSprint: 'S-004', currentWave: 12 }), null);
});

test('a story is in once the sprint branch holds its commit, whatever became of its branch', () => {
  const landed = { 'sprint/S-004': ['S-004.3'] };
  const kept = flight({ branches: [branch('sprint/S-004', 4, 'sprint-tip'), branch('story/S-004.3-x', 2, 'bbb')], landed });
  assert.deepEqual([liveState(story('S-004.3'), kept, 'sprint/S-004').state, liveState(story('S-004.3'), kept, 'sprint/S-004').detail], ['committed', 'on sprint/S-004']);
  // its branch is gone: the commit is what counts
  const gone = flight({ landed });
  assert.deepEqual([liveState(story('S-004.3'), gone, 'sprint/S-004').state, liveState(story('S-004.3'), gone, 'sprint/S-004').source], ['committed', 'git']);
  // a story whose commit was reverted is not in the list, and is believed from the board
  assert.equal(liveState(story('S-004.4', 'returned'), gone, 'sprint/S-004').state, 'returned');
});

test('a locked detached worktree at the sprint tip is the verifier or a reviewer reading every committed story', () => {
  const landed = { 'sprint/S-004': ['S-004.3'] };
  const branches = [branch('sprint/S-004', 4, 'sprint-tip'), branch('story/S-004.3-x', 2, 'bbb'), branch('story/S-004.4-x', 1, 'ccc')];
  const reading = flight({ branches, landed, worktrees: [worktree({ main: true, branch: 'sprint/S-004', head: 'sprint-tip' }), worktree({ detached: true, head: 'sprint-tip', locked: true })] });
  const live = liveState(story('S-004.3'), reading, 'sprint/S-004');
  assert.deepEqual([live.state, live.running, live.detail], ['checking', true, 'in sprint/S-004']);
  // a story that is not committed yet is not what they read
  assert.equal(liveState(story('S-004.4'), reading, 'sprint/S-004').state, 'handed-back');
});

test('a story being built: a locked worktree, a branch with work, the main checkout in relay mode', () => {
  const building = flight({
    branches: [branch('sprint/S-004', 4, 'sprint-tip'), branch('story/S-004.3-x', 0, 'sprint-tip')],
    worktrees: [worktree({ branch: 'story/S-004.3-x', head: 'sprint-tip', locked: true })],
  });
  assert.deepEqual([liveState(story('S-004.3'), building, 'sprint/S-004').state, liveState(story('S-004.3'), building, 'sprint/S-004').running], ['building', true]);
  const returned = flight({ branches: [branch('sprint/S-004', 4, 'sprint-tip'), branch('story/S-004.3-x', 2, 'bbb')] });
  assert.equal(liveState(story('S-004.3'), returned, 'sprint/S-004').state, 'handed-back');
  const relay = flight({ branches: [branch('story/S-004.3-x', 1, 'ccc')], worktrees: [worktree({ main: true, branch: 'story/S-004.3-x', head: 'ccc' })] });
  assert.equal(liveState(story('S-004.3'), relay, null).state, 'building');
  // found by its id when the board does not name the branch; S-004.30 is another story
  assert.equal(liveState({ id: 'S-004.3', state: 'building', branch: '' }, returned, 'sprint/S-004').state, 'handed-back');
  assert.equal(liveState({ id: 'S-004.3', state: 'building', branch: '' }, flight({ branches: [branch('story/S-004.30-x', 1)] }), 'sprint/S-004').source, 'board');
});

test('story files are found in a sprint folder under sprints/ and in its done/', () => {
  const files = storyFiles(['docs/board/sprints/S-004-share/S-004.1-port.md', 'docs/board/sprints/done/S-003-search/S-003.2-index.md', 'docs/board/sprints/S-004-share/sprint.md', 'docs/board/log/wave-0011.md']);
  assert.deepEqual([...files], [['S-004.1', 'docs/board/sprints/S-004-share/S-004.1-port.md'], ['S-003.2', 'docs/board/sprints/done/S-003-search/S-003.2-index.md']]);
});

test('the four columns of a wave in flight', () => {
  const board = parseBoard(today('BOARD.md'));
  const log = { now: board.now, entries: [parseWave(today('wave-0011.md'))] };
  const paths = [
    ...['S-004.1-share-port', 'S-004.2-share-adapter', 'S-004.3-share-dialog', 'S-004.4-revoke', 'S-004.5-revoked-says-so', 'S-004.6-copy-button'].map((name) => `docs/board/sprints/S-004-share-links/${name}.md`),
    ...['S-000.7-bump-runner', 'S-000.9-paid-tiles'].map((name) => `docs/board/sprints/S-000-maintenance/${name}.md`),
    ...['S-000.5-doc-formatter', 'S-000.6-one-clamp'].map((name) => `docs/board/sprints/done/S-000-maintenance/${name}.md`),
    ...['S-003.1-index', 'S-003.2-query'].map((name) => `docs/board/sprints/S-003-search/${name}.md`),
    'docs/board/sprints/done/S-002-boards/S-002.1-columns.md',
    'docs/board/BOARD.md',
    'docs/board/_TEMPLATE-story.md',
    'docs/board/inbox/README.md',
    'docs/board/inbox/fix-zoom.md',
    'docs/board/sprints/S-000-maintenance/sprint.md',
    'docs/board/sprints/S-004-share-links/sprint.md',
    'docs/board/sprints/S-005-due-dates/sprint.md',
    'docs/board/sprints/S-005-due-dates/S-005.1-due-port.md',
    'docs/board/sprints/S-005-due-dates/S-005.2-due-card.md',
    'docs/board/sprints/S-007-export/sprint.md',
    'docs/board/log/wave-0011.md',
  ];
  const repo = flight({
    branches: [
      branch('sprint/S-004', 6, 'sprint-tip'),
      branch('story/S-004.3-share-dialog', 2, 'dialog-tip'),
      branch('story/S-004.4-revoke', 0, 'sprint-tip'),
      branch('story/S-000.7-bump-runner', 1, 'bump-tip'),
      branch('plan/S-008-print', 1),
      branch('plan/S-007-export', 1),
      branch('plan/fix-zoom', 1),
      branch('plan/retro-S-003', 1),
    ],
    worktrees: [
      worktree({ main: true, branch: 'sprint/S-004', head: 'sprint-tip' }),
      worktree({ branch: 'story/S-004.4-revoke', head: 'sprint-tip', locked: true }),
    ],
    landed: { 'sprint/S-004': ['S-004.1', 'S-004.2', 'S-004.3'] },
  });

  const view = columns({ board, log, paths, git: repo });
  assert.equal(view.sprint, 'sprint/S-004');
  assert.deepEqual(view.progress.map((c) => [c.id, c.live.state, c.live.running]), [['S-004.4', 'building', true]]);
  assert.deepEqual(view.review.map((c) => [c.id, c.live.state]), [['S-004.3', 'committed'], ['S-000.7', 'handed-back']]);
  assert.deepEqual(view.waiting.ready.map((c) => [c.id, c.deps]), [
    ['S-004.5', [{ id: 'S-004.3', done: false }, { id: 'S-004.4', done: false }]],
    ['S-005.1', []],
  ]);
  assert.deepEqual(view.waiting.blocked.map((c) => c.id), ['S-000.9']);
  assert.deepEqual(view.waiting.backlog.map((c) => c.id), ['S-005.2', 'S-006']);
  assert.deepEqual(view.waiting.unlisted.map((c) => [c.id, c.title, c.note]), [
    ['S-004.6', 'Copy button', 'story not on the board yet'],
    ['', 'Fix zoom', 'in the inbox'],
    ['S-007', 'Export', 'sprint not on the board yet'],
    ['S-008', 'Print', 'being planned on plan/S-008-print'],
    ['', 'Retro S 003', 'being planned on plan/retro-S-003'],
  ]);
  assert.deepEqual(view.done.map((c) => c.id), ['S-004.2', 'S-004.1', 'S-000.6']);
  // S-000.5 and S-002.1 in done/, and the two stories of the landed S-003: none of their waves is loaded
  assert.equal(view.doneOlder, 4);
  assert.equal(view.waiting.ready[0].file, 'docs/board/sprints/S-004-share-links/S-004.5-revoked-says-so.md');
  assert.deepEqual([view.waiting.ready[0].parent, view.waiting.ready[1].parent], ['S-004', 'S-005']);
});

test('a dependency is done when it has a file and nothing lists it as open', () => {
  const text = today('BOARD.md').replace('| S-005.1 | The due-date port | none |', '| S-005.1 | The due-date port | S-003.2, S-009.9 |');
  const view = columns({ board: parseBoard(text), log: { now: '', entries: [] }, paths: ['docs/board/sprints/S-003-search/S-003.2-query.md'], git: null });
  // S-003.2 landed long ago; S-009.9 is an id nobody has written a story for
  assert.deepEqual(view.waiting.ready[1].deps, [{ id: 'S-003.2', done: true }, { id: 'S-009.9', done: false }]);
});

test('no wave being built leaves both middle columns empty', () => {
  const text = today('BOARD.md').replace('current_wave: 12', 'current_wave: none').replace(/\| S-(004\.3|004\.4|000\.7) .*\| building \|\n/g, '');
  const view = columns({ board: parseBoard(text), log: { now: '', entries: [] }, paths: [], git: flight({}) });
  assert.deepEqual([view.sprint, view.progress, view.review], ['sprint/S-004', [], []]);
});

// --- Before ADR-0011: a task on task/T-…, merged into a numbered sprint branch ------------------

const row = (id, state = 'building') => ({ id, state, branch: `task/${id}-x` });
const git = (over) => ({
  defaultBranch: 'main',
  worktrees: [worktree({ main: true, branch: 'sprint/07' })],
  branches: [branch('sprint/07', 1)],
  merged: { 'sprint/07': [] },
  ...over,
});

test('before: the sprint branch is the one the board numbers, else the one checked out', () => {
  const repo = git({ branches: [branch('sprint/07', 1), branch('sprint/06', 0)] });
  assert.equal(sprintBranch(repo, { currentSprint: null, currentWave: 6 }), 'sprint/06');
  assert.equal(sprintBranch(repo, { currentSprint: null, currentWave: null }), 'sprint/07');
  assert.equal(sprintBranch(git({ worktrees: [worktree({ main: true, branch: 'main' })] }), { currentSprint: null, currentWave: null }), null);
  assert.equal(sprintBranch(null, { currentSprint: null, currentWave: 7 }), null);
});

test('without git, or without the branch, the board is believed', () => {
  assert.deepEqual(liveState(row('T-1.1', 'checking'), null, null), { state: 'checking', source: 'board', running: false, detail: '' });
  assert.equal(liveState(row('T-1.1', ''), git({}), 'sprint/07').state, 'building');
  // a git too old to count commits cannot tell work from none
  const old = git({ branches: [{ ...branch('task/T-1.1-x', null) }] });
  assert.equal(liveState(row('T-1.1', 'merged'), old, 'sprint/07').source, 'board');
});

test('before: a locked worktree on the task branch is an agent building', () => {
  const repo = git({
    branches: [branch('task/T-1.1-x', 0, 'aaa')],
    worktrees: [worktree({ branch: 'task/T-1.1-x', head: 'aaa', locked: true })],
  });
  const live = liveState(row('T-1.1'), repo, 'sprint/07');
  assert.deepEqual([live.state, live.running, live.source], ['building', true, 'git']);
});

test('before: a fresh branch is not "merged" merely because it has no commits', () => {
  // git lists a branch at main's tip as merged into everything that grew from main
  const repo = git({ branches: [branch('task/T-1.1-x', 0)], merged: { 'sprint/07': ['task/T-1.1-x'] } });
  assert.equal(liveState(row('T-1.1'), repo, 'sprint/07').state, 'building');
});

test('before: a locked detached worktree at the tip is the verifier running', () => {
  const repo = git({
    branches: [branch('task/T-1.1-x', 2, 'bbb')],
    worktrees: [worktree({ branch: 'task/T-1.1-x', head: 'bbb' }), worktree({ detached: true, head: 'bbb', locked: true })],
  });
  const live = liveState(row('T-1.1'), repo, 'sprint/07');
  assert.deepEqual([live.state, live.running, live.commits], ['checking', true, 2]);
});

test('before: a detached worktree at another commit is somebody else', () => {
  const repo = git({
    branches: [branch('task/T-1.1-x', 2, 'bbb')],
    worktrees: [worktree({ branch: 'task/T-1.1-x', head: 'bbb' }), worktree({ detached: true, head: 'zzz', locked: true })],
  });
  assert.equal(liveState(row('T-1.1'), repo, 'sprint/07').state, 'handed-back');
});

test('before: verifier finished, then merged', () => {
  const worktrees = [worktree({ branch: 'task/T-1.1-x', head: 'bbb' }), worktree({ detached: true, head: 'bbb' })];
  const checked = git({ branches: [branch('task/T-1.1-x', 2, 'bbb')], worktrees });
  assert.equal(liveState(row('T-1.1'), checked, 'sprint/07').state, 'checked');
  const merged = git({ branches: [branch('task/T-1.1-x', 2, 'bbb')], worktrees, merged: { 'sprint/07': ['task/T-1.1-x'] } });
  assert.deepEqual(
    [liveState(row('T-1.1'), merged, 'sprint/07').state, liveState(row('T-1.1'), merged, 'sprint/07').detail],
    ['merged', 'into sprint/07'],
  );
});

test('before: a locked detached worktree at the sprint tip is the verifier reading every merged task', () => {
  const branches = [branch('sprint/07', 3, 'sprint-tip'), branch('task/T-1.1-x', 2, 'bbb'), branch('task/T-1.2-x', 1, 'ccc')];
  const merged = { 'sprint/07': ['task/T-1.1-x'] };
  const running = git({ branches, merged, worktrees: [worktree({ main: true, branch: 'sprint/07', head: 'sprint-tip' }), worktree({ detached: true, head: 'sprint-tip', locked: true })] });
  const live = liveState(row('T-1.1'), running, 'sprint/07');
  assert.deepEqual([live.state, live.running, live.detail], ['checking', true, 'in sprint/07']);
  // a task that is not merged is not what the verifier reads
  assert.equal(liveState(row('T-1.2'), running, 'sprint/07').state, 'handed-back');
  // once the verifier has returned, its worktree is no longer locked
  const finished = git({ branches, merged, worktrees: [worktree({ detached: true, head: 'sprint-tip' })] });
  assert.equal(liveState(row('T-1.1'), finished, 'sprint/07').state, 'merged');
});

test('before: relay mode, the task branch checked out in the main checkout is being built', () => {
  const repo = git({ branches: [branch('task/T-1.1-x', 1, 'ccc')], worktrees: [worktree({ main: true, branch: 'task/T-1.1-x', head: 'ccc' })] });
  assert.equal(liveState(row('T-1.1'), repo, null).state, 'building');
});

test("the orchestrator's verdict stands where git cannot know it", () => {
  const repo = git({ branches: [branch('task/T-1.1-x', 3)] });
  assert.deepEqual([liveState(row('T-1.1', 'returned'), repo, 'sprint/07').state, liveState(row('T-1.1', 'blocked'), repo, 'sprint/07').state], ['returned', 'blocked']);
});

test('before: the branch is found by its task id when the board does not name it', () => {
  const repo = git({ branches: [branch('task/T-1.1-other-slug', 1)] });
  assert.equal(liveState({ id: 'T-1.1', state: 'building', branch: '' }, repo, 'sprint/07').state, 'handed-back');
  // T-1.10 is another task
  assert.equal(liveState({ id: 'T-1.1', state: 'building', branch: '' }, git({ branches: [branch('task/T-1.10-x', 1)] }), 'sprint/07').source, 'board');
});

test('before: the four columns of a sprint in flight', () => {
  const board = parseBoard(fixture('BOARD.md'));
  const log = parseSprintLog(fixture('SPRINT_LOG.md'));
  const cards = ['T-101.2-layer-reorder', 'T-101.3-opacity', 'T-101.4-layer-order', 'T-101.1-layer-port']
    .map((name) => `docs/board/ST-101-layers/${name}.md`)
    .concat(['T-000.2-doc-formatter', 'T-000.3-lint-tests', 'T-000.4-tile-cache', 'T-000.5-bump-runner', 'T-000.6-one-clamp', 'T-000.7-second-device', 'T-000.8-zoom-jumps'].map((name) => `docs/board/ST-000-maintenance/${name}.md`));
  const paths = [
    ...cards,
    'docs/board/BOARD.md',
    'docs/board/_TEMPLATE-task.md',
    'docs/board/inbox/README.md',
    'docs/board/inbox/fix-zoom.md',
    'docs/board/ST-001-walking-skeleton/story.md',
    'docs/board/ST-101-layers/story.md',
    'docs/board/ST-104-print/story.md',
  ];
  const repo = git({
    branches: [
      branch('sprint/07', 1),
      branch('task/T-101.2-layer-reorder', 0, 'main-tip'),
      branch('task/T-000.4-tile-cache', 2, 'cache-tip'),
      branch('task/T-000.5-bump-runner', 1, 'bump-tip'),
      branch('task/T-101.3-opacity', 3, 'opacity-tip'),
      branch('story/ST-105-export', 1),
      branch('story/ST-104-print', 1),
      branch('card/fix-zoom', 1),
    ],
    worktrees: [
      worktree({ main: true, branch: 'sprint/07' }),
      worktree({ branch: 'task/T-101.2-layer-reorder', head: 'main-tip', locked: true }),
      worktree({ branch: 'task/T-000.4-tile-cache', head: 'cache-tip' }),
      worktree({ detached: true, head: 'cache-tip', locked: true }),
    ],
    merged: { 'sprint/07': ['task/T-000.5-bump-runner', 'task/T-101.2-layer-reorder'] },
  });

  const view = columns({ board, log, paths, git: repo });
  assert.equal(view.sprint, 'sprint/07');
  assert.deepEqual(view.progress.map((c) => [c.id, c.live.state]), [['T-101.2', 'building'], ['T-101.3', 'returned']]);
  assert.deepEqual(view.review.map((c) => [c.id, c.live.state]), [['T-000.4', 'checking'], ['T-000.5', 'merged']]);
  assert.deepEqual(view.waiting.ready.map((c) => [c.id, c.deps]), [
    ['T-101.4', [{ id: 'T-101.2', done: false }]],
    ['T-000.6', []],
    ['T-102.1', [{ id: 'T-000.3', done: true }, { id: 'T-101.1', done: true }]],
  ]);
  assert.deepEqual(view.waiting.blocked.map((c) => c.id), ['T-102.2']);
  assert.deepEqual(view.waiting.backlog.map((c) => c.id), ['T-000.7', 'ST-103']);
  assert.deepEqual(view.waiting.unlisted.map((c) => [c.id, c.title, c.note]), [
    ['T-000.8', 'Zoom jumps', 'card not on the board yet'],
    ['', 'Fix zoom', 'in the inbox'],
    ['ST-104', 'Print', 'story not on the board yet'],
    ['ST-105', 'Export', 'being planned on story/ST-105-export'],
  ]);
  assert.deepEqual(view.done.map((c) => c.id), ['T-000.3', 'T-101.1']);
  assert.equal(view.doneOlder, 1); // T-000.2: landed in sprint 5, no longer among the last rows
  assert.equal(view.waiting.ready[0].file, 'docs/board/ST-101-layers/T-101.4-layer-order.md');
  assert.equal(view.waiting.ready[0].parent, 'ST-101');
});

test('before: no sprint in flight leaves both middle columns empty', () => {
  const board = parseBoard(fixture('BOARD.md').replace('current_sprint: 7', 'current_sprint: none').replace(/\| T-(101\.2|000\.4|000\.5|101\.3) .*\n/g, ''));
  const view = columns({ board, log: parseSprintLog(''), paths: [], git: git({ worktrees: [worktree({ main: true, branch: 'main' })], branches: [] }) });
  assert.deepEqual([view.sprint, view.progress, view.review], [null, [], []]);
});
