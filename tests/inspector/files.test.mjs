import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { buildIndex, fileRoute, groups, hints, resolver } from '../../scaffold/tools/inspector/files.mjs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

const PATHS = [
  'CLAUDE.md',
  'README.md',
  'KICKOFF.md',
  'apps/web/CLAUDE.md',
  'packages/core/CLAUDE.md',
  'docs/PROGRESS.md',
  'docs/PRIME_DIRECTIVES.md',
  'docs/ARCHITECTURE.md',
  'docs/OWNER_GATES.md',
  'docs/AGENT_WORKFLOW.md',
  'docs/ORCHESTRATION.md',
  'docs/adr/ADR-0005-sprints.md',
  'docs/adr/0031-cloud-functions.md',
  'docs/adr/proposed/README.md',
  'docs/archive/HISTORY_LOG.md',
  'docs/board/BOARD.md',
  'docs/board/SPRINT_LOG.md',
  'docs/board/_TEMPLATE-task.md',
  'docs/board/inbox/README.md',
  'docs/board/ST-000-maintenance/story.md',
  'docs/board/ST-000-maintenance/T-000.10-quiet-lines.md',
  'docs/board/ST-000-maintenance/T-000.2-share-refusal.md',
  'docs/board/ST-012-share-links/story.md',
  'docs/board/ST-012-share-links/T-012.1-share-port.md',
  '.claude/README.md',
  '.claude/settings.json',
  '.claude/agents/implementer.md',
  '.claude/skills/sprint/SKILL.md',
  '.claude/skills/feature/SKILL.md',
  '.claude/skills/playwright/SKILL.md',
  '.github/pull_request_template.md',
];

test('files are grouped by what they are for', () => {
  const found = Object.fromEntries(groups(PATHS).map((g) => [g.title, g.items.map((i) => i.label)]));
  assert.deepEqual(Object.keys(found), [
    'Start here',
    'Rules and architecture',
    'Protocol and commands',
    'Decisions',
    'Board',
    'Agents and skills',
    'Directory context',
    'Archive',
    'Other',
  ]);
  assert.deepEqual(found['Start here'], ['CLAUDE', 'PROGRESS', 'BOARD', 'SPRINT_LOG']);
  assert.deepEqual(found['Rules and architecture'], ['ARCHITECTURE', 'OWNER_GATES', 'PRIME_DIRECTIVES']);
  assert.deepEqual(found['Protocol and commands'], ['/feature', '/sprint', 'AGENT_WORKFLOW', 'ORCHESTRATION']);
  assert.deepEqual(found['Agents and skills'], ['implementer', 'README', 'settings.json', 'playwright']);
  assert.deepEqual(found['Directory context'], ['apps/web/', 'packages/core/']);
  assert.deepEqual(found.Other, ['pull_request_template', 'KICKOFF', 'README']);
});

test('cards sort by number within their story, not by spelling', () => {
  const board = groups(PATHS).find((g) => g.title === 'Board').items;
  assert.deepEqual(board.map((i) => [i.folder, i.label]), [
    ['', '_TEMPLATE-task'],
    ['inbox', 'README'],
    ['ST-000-maintenance', 'story'],
    ['ST-000-maintenance', 'T-000.2-share-refusal'],
    ['ST-000-maintenance', 'T-000.10-quiet-lines'],
    ['ST-012-share-links', 'story'],
    ['ST-012-share-links', 'T-012.1-share-port'],
  ]);
});

test('references resolve to the files this project has', () => {
  const resolve = resolver(buildIndex(PATHS), 'docs/board/ST-012-share-links/T-012.1-share-port.md');
  const card = fileRoute('docs/board/ST-012-share-links/T-012.1-share-port.md');
  assert.equal(card, '#/file/docs/board/ST-012-share-links/T-012.1-share-port.md');

  assert.equal(resolve('id', 'T-012.1'), card);
  assert.equal(resolve('id', 'ST-012'), fileRoute('docs/board/ST-012-share-links/story.md'));
  assert.equal(resolve('id', 'T-999.9'), null);
  assert.equal(resolve('adr', '0005'), fileRoute('docs/adr/ADR-0005-sprints.md'));
  assert.equal(resolve('adr', '0031'), fileRoute('docs/adr/0031-cloud-functions.md')); // a project's own numbering
  assert.equal(resolve('adr', '0099'), null);
  assert.equal(resolve('directive', '29'), '#/file/docs/PRIME_DIRECTIVES.md@n-29');

  assert.equal(resolve('code', 'docs/PROGRESS.md'), fileRoute('docs/PROGRESS.md'));
  assert.equal(resolve('code', 'docs\\PROGRESS.md:12'), fileRoute('docs/PROGRESS.md'));
  assert.equal(resolve('code', 'story.md'), fileRoute('docs/board/ST-012-share-links/story.md')); // beside the card
  assert.equal(resolve('code', 'T-012.1'), card);
  assert.equal(resolve('code', 'ADR 0031'), fileRoute('docs/adr/0031-cloud-functions.md'));
  assert.equal(resolve('code', 'pnpm verify:fast'), null);
  assert.equal(resolve('code', 'src/index.ts'), null);

  assert.equal(resolve('link', '../../PROGRESS.md#known-debt'), '#/file/docs/PROGRESS.md@known-debt');
  assert.equal(resolve('link', '../_TEMPLATE-task.md'), fileRoute('docs/board/_TEMPLATE-task.md'));
  assert.equal(resolve('link', '#history'), `${card}@history`);
  assert.equal(resolve('link', '../../../../../etc/passwd'), null);
  assert.equal(resolve('link', '/docs/adr/proposed'), fileRoute('docs/adr/proposed/README.md'));
});

test('a path with odd characters survives its route', () => {
  assert.equal(fileRoute('docs/a b/c#d.md', 'x y'), '#/file/docs/a%20b/c%23d.md@x%20y');
});

test('hints name what is unfilled, and nothing else: no file has a line budget', () => {
  assert.deepEqual(hints({ path: 'CLAUDE.md', lines: 5000, slots: 0 }), []);
  assert.deepEqual(hints({ path: 'apps/web/CLAUDE.md', lines: 5000, slots: 0 }), []);
  assert.deepEqual(hints({ path: 'docs/ARCHITECTURE.md', lines: 900, slots: 2 }), [{ kind: 'slot', text: '2 placeholders not filled in' }]);
  assert.deepEqual(hints({ path: 'apps/web/CLAUDE.md', lines: 41, slots: 1 }), [{ kind: 'slot', text: '1 placeholder not filled in' }]);
});

// --- Today's layout: a folder per sprint, a file per story, a log file per wave (ADR-0011) -------

const TODAY = [
  'CLAUDE.md',
  'docs/PROGRESS.md',
  'docs/GLOSSARY.md',
  'docs/FEATURES.md',
  'docs/CODING_STANDARDS.md',
  'docs/PRIME_DIRECTIVES.md',
  'docs/PLANNING.md',
  'docs/AGENT_WORKFLOW.md',
  'docs/ORCHESTRATION.md',
  'docs/adr/ADR-0011-sprints-as-folders.md',
  'docs/research/tile-hosts.md',
  'docs/reviews/2026-10-01-project-review.md',
  'docs/board/BOARD.md',
  'docs/board/LATER.md',
  'docs/board/_TEMPLATE-story.md',
  'docs/board/inbox/README.md',
  'docs/board/log/phase-0.md',
  'docs/board/log/wave-0002.md',
  'docs/board/log/wave-0010.md',
  'docs/board/sprints/S-000-maintenance/sprint.md',
  'docs/board/sprints/S-000-maintenance/S-000.10-quiet-lines.md',
  'docs/board/sprints/S-000-maintenance/S-000.2-share-refusal.md',
  'docs/board/sprints/S-012-share-links/sprint.md',
  'docs/board/sprints/S-012-share-links/S-012.1-share-port.md',
  'docs/board/sprints/S-012-share-links/review.md',
  'docs/board/sprints/done/S-011-search/sprint.md',
  'docs/board/sprints/done/S-011-search/S-011.1-index.md',
  'docs/board/sprints/done/S-011-search/retro.md',
  '.claude/agents/reviewer.md',
  '.claude/skills/implement/SKILL.md',
  '.claude/skills/sprint-review/SKILL.md',
  '.claude/skills/ideate/SKILL.md',
  '.claude/skills/ideate/PROJECT.md',
  '.claude/skills/playwright/SKILL.md',
];

test('today: files are grouped by what they are for', () => {
  const found = Object.fromEntries(groups(TODAY).map((g) => [g.title, g.items.map((i) => i.label)]));
  assert.deepEqual(Object.keys(found), ['Start here', 'Rules and architecture', 'Protocol and commands', 'Decisions', 'Research and reviews', 'Board', 'Agents and skills']);
  assert.deepEqual(found['Start here'], ['CLAUDE', 'PROGRESS', 'BOARD', 'GLOSSARY']);
  assert.deepEqual(found['Rules and architecture'], ['CODING_STANDARDS', 'FEATURES', 'PRIME_DIRECTIVES']);
  assert.deepEqual(found['Protocol and commands'], ['/ideate', '/implement', '/sprint-review', 'AGENT_WORKFLOW', 'ORCHESTRATION', 'PLANNING']);
  assert.deepEqual(found['Research and reviews'], ['tile-hosts', '2026-10-01-project-review']);
  assert.deepEqual(found['Agents and skills'], ['reviewer', 'PROJECT', 'playwright']);
});

test('today: stories sort by number within their sprint, and the log by wave', () => {
  const board = groups(TODAY).find((g) => g.title === 'Board').items;
  assert.deepEqual(board.map((i) => [i.folder, i.label]), [
    ['', '_TEMPLATE-story'],
    ['', 'LATER'],
    ['inbox', 'README'],
    ['log', 'phase-0'],
    ['log', 'wave-0002'],
    ['log', 'wave-0010'],
    ['sprints/done/S-011-search', 'retro'],
    ['sprints/done/S-011-search', 'S-011.1-index'],
    ['sprints/done/S-011-search', 'sprint'],
    ['sprints/S-000-maintenance', 'S-000.2-share-refusal'],
    ['sprints/S-000-maintenance', 'S-000.10-quiet-lines'],
    ['sprints/S-000-maintenance', 'sprint'],
    ['sprints/S-012-share-links', 'review'],
    ['sprints/S-012-share-links', 'S-012.1-share-port'],
    ['sprints/S-012-share-links', 'sprint'],
  ]);
});

test('today: references resolve to stories and sprints, wherever the sprint folder is', () => {
  const resolve = resolver(buildIndex(TODAY), 'docs/board/sprints/S-012-share-links/S-012.1-share-port.md');
  const story = fileRoute('docs/board/sprints/S-012-share-links/S-012.1-share-port.md');

  assert.equal(resolve('id', 'S-012.1'), story);
  assert.equal(resolve('id', 'S-012'), fileRoute('docs/board/sprints/S-012-share-links/sprint.md'));
  assert.equal(resolve('id', 'S-011.1'), fileRoute('docs/board/sprints/done/S-011-search/S-011.1-index.md'));
  assert.equal(resolve('id', 'S-011'), fileRoute('docs/board/sprints/done/S-011-search/sprint.md'));
  assert.equal(resolve('id', 'S-999.9'), null);
  assert.equal(resolve('id', 'T-012.1'), null); // the words of before are not this project's
  assert.equal(resolve('adr', '0011'), fileRoute('docs/adr/ADR-0011-sprints-as-folders.md'));

  assert.equal(resolve('code', 'S-012.1'), story);
  assert.equal(resolve('code', 'S-000'), fileRoute('docs/board/sprints/S-000-maintenance/sprint.md'));
  assert.equal(resolve('code', 'sprint.md'), fileRoute('docs/board/sprints/S-012-share-links/sprint.md')); // beside the story
  assert.equal(resolve('code', 'docs/GLOSSARY.md'), fileRoute('docs/GLOSSARY.md'));
  assert.equal(resolve('link', '../../_TEMPLATE-story.md'), fileRoute('docs/board/_TEMPLATE-story.md'));
});

test('today: an input is found by its id, open or applied', () => {
  const paths = ['docs/PROGRESS.md', 'docs/board/BOARD.md', 'docs/board/inputs/README.md', 'docs/board/inputs/I-007-mail-provider.md', 'docs/board/inputs/done/I-003-billing-account.md', '.claude/skills/resolve/SKILL.md'];
  const resolve = resolver(buildIndex(paths), 'docs/PROGRESS.md');
  assert.equal(resolve('id', 'I-007'), fileRoute('docs/board/inputs/I-007-mail-provider.md'));
  assert.equal(resolve('code', 'I-003'), fileRoute('docs/board/inputs/done/I-003-billing-account.md'));
  assert.equal(resolve('id', 'I-999'), null);
  const found = Object.fromEntries(groups(paths).map((g) => [g.title, g.items.map((i) => [i.folder, i.label])]));
  assert.deepEqual(found.Board, [['inputs', 'I-007-mail-provider'], ['inputs', 'README'], ['inputs/done', 'I-003-billing-account']]);
  assert.deepEqual(found['Protocol and commands'], [['', '/resolve']]);
});
