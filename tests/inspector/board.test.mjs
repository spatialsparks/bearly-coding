import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { parseBoard, parseProgress, parseSprintLog, parseWave, sprintOf, waveFiles } from '../../scaffold/tools/inspector/board.mjs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const scaffold = (name) => read(`../../scaffold/docs/${name}`);
const drifted = (name) => read(`../fixtures/drifted/${name}`);
const sprints = (name) => read(`../fixtures/sprints/${name}`);

// The board the template ships is the contract: if a heading or a column is renamed there,
// this fails before any project finds out in its browser.
test('the scaffold board parses as shipped', () => {
  const board = parseBoard(scaffold('board/BOARD.md'));
  assert.equal(board.shape, 'sprints');
  assert.deepEqual(board.meta, {
    updated: '{{YYYY-MM-DD}}',
    updatedBy: 'phase-0',
    maxParallel: null, // a placeholder until the kickoff fills it in
    maxOpenStories: null,
    land: 'auto',
    currentSprint: null,
    currentWave: null,
    nextWave: 1,
  });
  assert.equal(board.now, '', 'the Now line is a slot until Phase 0 writes it');
  assert.deepEqual(board.milestones, []);
  assert.deepEqual(board.sprints.map((s) => [s.ids, s.status, s.progress]), [
    [['S-000'], 'standing', { done: 0, total: 0 }],
    [['S-001'], 'planned', { done: 0, total: 3 }],
  ]);
  assert.deepEqual(board.ready.map((r) => [r.id, r.dependsOn, r.solo, r.model]), [
    ['S-001.1', [], true, 'opus'],
    ['S-001.2', ['S-001.1'], false, 'opus'],
  ]);
  for (const table of ['inWave', 'blocked', 'backlog', 'done']) assert.deepEqual(board[table], [], table);
});

test('a board with a sprint in flight gives the sprint, the wave and the stories of each table', () => {
  const board = parseBoard(sprints('BOARD.md'));
  assert.equal(board.shape, 'sprints');
  assert.deepEqual([board.meta.currentSprint, board.meta.currentWave, board.meta.nextWave, board.meta.land], ['S-004', 12, 13, 'ask']);
  assert.match(board.now, /^Boards and search work; sharing is in flight\b.*on you\.$/);
  assert.deepEqual(board.sprints.map((s) => [s.ids[0], s.status, s.progress?.done]), [
    ['S-000', 'standing', 6],
    ['S-003', 'landed', 4],
    ['S-004', 'in progress', 2],
    ['S-005', 'planned', 0],
  ]);
  assert.deepEqual(board.inWave.map((r) => [r.id, r.model, r.branch, r.state]), [
    ['S-004.3', 'opus', 'story/S-004.3-share-dialog', 'building'],
    ['S-004.4', 'opus', 'story/S-004.4-revoke', 'building'],
    ['S-000.7', 'sonnet', 'story/S-000.7-bump-runner', 'building'],
  ]);
  assert.deepEqual(board.ready.map((r) => [r.id, r.dependsOn, r.solo]), [
    ['S-004.5', ['S-004.3', 'S-004.4'], false],
    ['S-005.1', [], true],
  ]);
  assert.deepEqual(board.blocked.map((r) => r.id), ['S-000.9']);
  assert.deepEqual(board.backlog.map((r) => r.id), ['S-005.2', 'S-006']);
  assert.deepEqual(board.done.map((r) => [r.id, r.wave]), [
    ['S-004.2', '11'],
    ['S-004.1', '10'],
    ['S-000.6', '10'],
  ]);
});

test('a board from before ADR-0011, reworded by an orchestrator, still reads', () => {
  const board = parseBoard(drifted('BOARD.md'));
  assert.equal(board.shape, 'stories');
  // what was the sprint's number is the wave's
  assert.deepEqual([board.meta.currentSprint, board.meta.currentWave, board.meta.nextWave], [null, 7, 8]);
  assert.equal(board.meta.maxParallel, 3);
  assert.equal(board.meta.maxOpenStories, 3);
  assert.equal(board.meta.updatedBy, 'the orchestrator, sprint 7 planned');
  assert.deepEqual(board.milestones.map((m) => m.name), ['M0', 'M1', 'Later']);

  assert.deepEqual(board.sprints.map((s) => s.ids), [['ST-000'], ['ST-001', 'ST-002'], ['ST-101'], ['ST-102']]);
  assert.deepEqual(board.sprints.map((s) => s.progress), [{ done: 2, total: 9 }, null, { done: 1, total: 4 }, { done: 0, total: 2 }]);
  assert.equal(board.sprints[1].storiesDone, 'before the board');
  assert.equal(board.sprints[3].title, 'Sharing a map | by link');

  assert.deepEqual(board.inWave.map((r) => [r.id, r.model, r.branch, r.state]), [
    ['T-101.2', 'opus', 'task/T-101.2-layer-reorder', 'building'],
    ['T-000.4', 'opus', 'task/T-000.4-tile-cache', 'building'],
    ['T-000.5', 'sonnet', 'task/T-000.5-bump-runner', 'building'],
    ['T-101.3', 'opus', 'task/T-101.3-opacity', 'returned'],
  ]);
  assert.deepEqual(board.ready.map((r) => [r.id, r.dependsOn, r.solo]), [
    ['T-101.4', ['T-101.2'], true],
    ['T-000.6', [], false],
    ['T-102.1', ['T-000.3', 'T-101.1'], true],
  ]);
  assert.equal(board.ready[1].ownedPaths, '`apps/web/src/ui/{clamp,Slider}*`');
  assert.deepEqual(board.blocked.map((r) => [r.id, r.needs]), [['T-102.2', "The owner's call on a provider"]]);
  assert.deepEqual(board.backlog.map((r) => r.id), ['T-000.7', 'ST-103']);
  assert.deepEqual(board.done.map((r) => [r.id, r.wave, r.pr]), [
    ['T-000.3', '6', '#41'],
    ['T-101.1', '5', '#39'],
  ]);
});

test('an empty or foreign file yields an empty board, not an error', () => {
  for (const text of ['', '# Not a board\n\nJust prose.', '## Ready\n\nno table here', null, undefined]) {
    const board = parseBoard(text);
    assert.deepEqual(board.ready, []);
    assert.deepEqual([board.meta.currentSprint, board.meta.currentWave], [null, null]);
  }
});

test("a wave's file gives its number, its sprint, its result and its stories", () => {
  const wave = parseWave(sprints('wave-0011.md'));
  assert.deepEqual([wave.name, wave.number, wave.sprint, wave.date, wave.result], ['Wave 11', 11, 'S-004', '2026-10-02', 'verified partly']);
  assert.deepEqual(wave.stories, [{ id: 'S-004.2', ok: true }, { id: 'S-000.8', ok: false }]);
  assert.deepEqual(wave.items.map((i) => i.label), ['Stories', 'Now works', 'Found', 'Health', 'Contexts']);
  assert.match(wave.items[0].text, /its commit reverted\)$/);
});

test('the scaffold log starts with Phase 0, and its README is no entry of its own making', () => {
  const phase = parseWave(scaffold('board/log/phase-0.md'));
  assert.deepEqual([phase.name, phase.number, phase.stories], ['Phase 0', null, []]);
  assert.equal(parseWave(''), null);
  assert.equal(parseWave(null), null);
  // the example in the README sits in a code fence, which is not a heading
  assert.equal(parseWave(scaffold('board/log/README.md')).name, 'Log');
});

test('the log files are found by their name, newest wave first', () => {
  const paths = ['docs/board/log/README.md', 'docs/board/log/phase-0.md', 'docs/board/log/wave-0002.md', 'docs/board/log/wave-0011.md', 'docs/board/log/wave-0010.md', 'docs/board/BOARD.md'];
  assert.deepEqual(waveFiles(paths), ['docs/board/log/wave-0011.md', 'docs/board/log/wave-0010.md', 'docs/board/log/wave-0002.md']);
  assert.deepEqual(waveFiles([]), []);
});

test('the sprint log of before ADR-0011 gives its Now line and its entries, examples left out', () => {
  const log = parseSprintLog(drifted('SPRINT_LOG.md'));
  assert.match(log.now, /^Maps open, save and reload.*a mail provider\.$/);
  assert.deepEqual(log.entries.map((e) => e.name), ['Sprint 6', 'Sprint 5', 'Before the board']);
  const [six, five] = log.entries;
  assert.deepEqual([six.number, six.date, six.result, six.pr], [6, '2026-03-01', 'landed partly', '41']);
  assert.deepEqual(six.stories, [{ id: 'T-000.3', ok: true }, { id: 'T-101.3', ok: false }]);
  assert.deepEqual(five.stories.map((t) => t.id), ['T-101.1', 'T-000.2']);
  assert.deepEqual(six.items.map((i) => i.label), ['Tasks', 'Now works', 'Found', 'Health']);
  assert.match(six.items[0].text, /retry queued$/);
  assert.deepEqual(parseSprintLog(null), { now: '', entries: [] });
});

test('progress gives its status, where the project stands and what waits on the owner', () => {
  const progress = parseProgress(drifted('PROGRESS.md'));
  assert.equal(progress.meta.status, 'needs-owner');
  assert.equal(progress.where, 'Maps open, save and reload. Layers can be switched on and off, and reordering them is in sprint 7.');
  assert.deepEqual(progress.owner, [
    "A mail provider for share links: pick one, then add its key as `MAIL_KEY` in the repository's secrets.",
    'A billing account for the tile host.',
  ]);
});

test('the scaffold progress file waits on nobody', () => {
  const progress = parseProgress(scaffold('PROGRESS.md'));
  assert.equal(progress.meta.status, 'on-track');
  assert.equal(progress.where, '');
  assert.deepEqual(progress.owner, []);
});

test('a story id names its sprint, in both sets of words', () => {
  assert.equal(sprintOf('S-012.3'), 'S-012');
  assert.equal(sprintOf('S-104'), 'S-104');
  assert.equal(sprintOf('T-012.3'), 'ST-012');
  assert.equal(sprintOf('ST-104'), 'ST-104');
  assert.equal(sprintOf(''), '');
});

test('no board makes the parsers crawl', () => {
  const digits = '1'.repeat(64000);
  const board = `## Sprints\n\n| Sprint | Stories done |\n| --- | --- |\n| S-001 | ${digits} |\n| S-${digits}.x | 1/2 |\n\n## Ready\n\n| Story | Title | Depends on |\n| --- | --- | --- |\n| S-${digits} | x | S-1.${digits} |\n| T-${digits} | x | T-1.${digits} |\n\n## x${' '.repeat(64000)}y\n`;
  const started = performance.now();
  parseBoard(board);
  parseBoard(`**Now:** ${digits}\n`);
  parseSprintLog(`**Now:** ${digits}\n\n## Sprint ${digits} · x\n\n- **Tasks** T-1.1 ${' '.repeat(64000)}x\n`);
  parseWave(`# Wave ${digits} · S-${digits} · x\n\n- **Stories** S-1.1 ${' '.repeat(64000)}x\n`);
  parseProgress(`## Blocked on the owner\n\n- ${digits}\n`);
  assert.ok(performance.now() - started < 1500);
});
