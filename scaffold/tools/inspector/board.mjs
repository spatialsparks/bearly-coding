// Reads the files that hold the project's state - BOARD.md, the log and PROGRESS.md - into
// plain data. Sections are found by their heading and columns by their header, never by
// position, and nothing here throws on a shape it does not know: a board an orchestrator has
// reworded still shows what it has.
//
// Two shapes are read (ADR-0011). Today a sprint is a folder, `S-012`, a story is a file in it,
// `S-012.3`, and a wave is what runs at once. Before, the same three were a story `ST-012`, a
// task card `T-012.3` and a sprint. The numbers are the same; only the words moved.

import { isTableStart, parseFrontmatter, splitRow, stripComments } from './markdown.mjs';

const STORY_ID = /\b(?:S|T)-\d+\.\d+\b/g; // a story, or the task card it used to be
const SPRINT_ID = /\b(?:S|ST)-\d+\b(?!\.\d)/g; // a sprint, or the story it used to be

const keyOf = (text) => text.toLowerCase().replace(/[^a-z0-9]/g, '');
const plain = (cell) => String(cell ?? '').replace(/[`*]/g, '').trim();
const matches = (text, pattern) => String(text ?? '').match(pattern) ?? [];
const number = (value) => (/^\d+$/.test(String(value ?? '').trim()) ? Number(value) : null);

/** Level-two sections of a document: `{ title, key, lines }`, fenced code left alone. */
export function sections(body) {
  const out = [];
  let current = { title: '', key: '', lines: [] };
  let fence = null;
  for (const line of body.split('\n')) {
    const mark = /^\s*(`{3,}|~{3,})/.exec(line);
    if (mark && !fence) fence = mark[1][0];
    else if (mark && fence === mark[1][0]) fence = null;
    const heading = fence ? null : /^##[ \t]+(.*)$/.exec(line);
    if (heading) {
      out.push(current);
      current = { title: heading[1].trim(), key: keyOf(heading[1]), lines: [] };
    } else {
      current.lines.push(line);
    }
  }
  out.push(current);
  return out;
}

/** The first table among `lines`, each row an object keyed by its column's header. */
export function firstTable(lines) {
  const start = lines.findIndex((line, i) => isTableStart(line, lines[i + 1]));
  if (start < 0) return [];
  const headers = splitRow(lines[start]).map(keyOf);
  const rows = [];
  for (let i = start + 2; i < lines.length && lines[i].trim() && lines[i].includes('|'); i += 1) {
    const cells = splitRow(lines[i]);
    rows.push(Object.fromEntries(headers.map((header, n) => [header, cells[n] ?? ''])));
  }
  return rows;
}

const section = (all, ...names) => all.find((s) => names.some((name) => s.key.startsWith(name)));
const rowsOf = (all, ...names) => firstTable(section(all, ...names)?.lines ?? []);

function storyRow(row) {
  const label = plain(row.story ?? row.task ?? row.storyorsprint ?? row.taskorstory ?? '');
  return {
    id: matches(label, STORY_ID)[0] ?? matches(label, SPRINT_ID)[0] ?? label,
    title: row.title ?? '',
    dependsOn: matches(row.dependson, STORY_ID),
    ownedPaths: row.ownedpaths ?? '',
    solo: /^y/i.test(plain(row.solo)),
    model: plain(row.model).toLowerCase(),
    branch: plain(row.branch),
    state: plain(row.state).toLowerCase(),
    why: row.why ?? '',
    needs: row.needs ?? '',
    missing: row.missing ?? '',
    wave: plain(row.wave ?? row.sprint),
    pr: plain(row.pr),
  };
}

// The scaffold's unfilled guidance, `_[like this]_`, is not content.
const isSlot = (text) => /^_\[[\s\S]*\]_$/.test(text.trim());

/** The `**Now:**` paragraph of a document, on one line. */
function nowLine(body) {
  const lines = body.split('\n');
  const at = lines.findIndex((line) => /^\*\*Now:?\*\*:?/.test(line));
  let now = '';
  for (let i = at; i >= 0 && i < lines.length && lines[i].trim(); i += 1) now += `${lines[i].trim()} `;
  now = now.replace(/^\*\*Now:?\*\*:?\s*/, '').trim();
  return isSlot(now) ? '' : now;
}

export function parseBoard(text) {
  const { data, body } = parseFrontmatter(text);
  const clean = stripComments(body);
  const all = sections(clean);
  // A board that lists sprints, or counts waves, is in today's words.
  const today = Boolean(section(all, 'sprints')) || data.current_wave !== undefined;
  const stories = (...names) => rowsOf(all, ...names).map(storyRow).filter((row) => row.id || row.title);
  return {
    shape: today ? 'sprints' : 'stories',
    meta: {
      updated: data.updated ?? '',
      updatedBy: data.updated_by ?? '',
      maxParallel: number(data.max_parallel),
      maxOpenStories: number(data.max_open_stories),
      land: plain(data.land).toLowerCase(),
      // null while they read `none`. Before ADR-0011 `current_sprint` was the wave's number.
      currentSprint: today ? (matches(data.current_sprint, SPRINT_ID)[0] ?? null) : null,
      currentWave: number(today ? data.current_wave : data.current_sprint),
      nextWave: number(today ? data.next_wave : data.next_sprint),
    },
    now: nowLine(clean),
    milestones: rowsOf(all, 'milestones').map((row) => ({
      name: plain(row.milestone),
      delivers: row.delivers ?? '',
      stories: row.stories ?? '',
      doneWhen: row.donewhen ?? '',
    })),
    sprints: rowsOf(all, 'sprints', 'stories').map((row) => {
      const done = row.storiesdone ?? row.tasksdone ?? '';
      const progress = /(\d{1,6})\s*\/\s*(\d{1,6})/.exec(done);
      const label = plain(row.sprint ?? row.story);
      return {
        ids: matches(label, SPRINT_ID),
        label,
        title: row.title ?? '',
        milestone: plain(row.milestone),
        status: plain(row.status).toLowerCase(),
        storiesDone: done,
        progress: progress ? { done: Number(progress[1]), total: Number(progress[2]) } : null,
      };
    }),
    inWave: stories('inwave', 'insprint'),
    ready: stories('ready'),
    blocked: stories('blocked'),
    backlog: stories('backlog'),
    done: stories('done'),
  };
}

/** Top-level bullets of a section, each joined onto one line. */
function bullets(lines) {
  const out = [];
  let open = false; // prose between bullets ends the one before it
  for (const line of lines) {
    const item = /^[-*+]\s+(.*)$/.exec(line);
    if (item) out.push(item[1]);
    else if (open && /^\s+\S/.test(line)) out[out.length - 1] += ` ${line.trim()}`;
    if (item || line.trim()) open = Boolean(item) || (open && /^\s/.test(line));
  }
  return out;
}

/** One entry of the log, from its heading - `Wave 12 · S-004 · 2026-10-03 · verified` - and its lines. */
function entryOf(title, lines) {
  const parts = title.split('·').map((part) => part.trim());
  const items = bullets(lines).map((item) => {
    const labelled = /^\*\*(.+?)\*\*\s*(.*)$/.exec(item);
    return labelled ? { label: labelled[1], text: labelled[2] } : { label: '', text: item };
  });
  const storyLine = items.find((item) => /^(?:stories|tasks?)$/i.test(item.label))?.text ?? '';
  return {
    title,
    name: parts[0],
    number: number(/^(?:wave|sprint)\s+(\d+)/i.exec(parts[0])?.[1]),
    sprint: parts.slice(1).map((part) => matches(part, SPRINT_ID)[0]).find(Boolean) ?? '',
    date: parts.find((part) => /^\d{4}-\d{2}-\d{2}$/.test(part)) ?? '',
    result: parts.find((part) => /landed|verified/i.test(part)) ?? '',
    pr: parts.map((part) => /#(\d+)/.exec(part)?.[1]).find(Boolean) ?? '',
    items,
    stories: [...storyLine.matchAll(/\b((?:S|T)-\d+\.\d+)\s*([✓✗])/g)].map((m) => ({ id: m[1], ok: m[2] === '✓' })),
  };
}

/** One file of `docs/board/log/`: a wave, or Phase 0. Null when it has no heading. */
export function parseWave(text) {
  const lines = stripComments(parseFrontmatter(text).body).split('\n');
  let fence = null;
  for (let i = 0; i < lines.length; i += 1) {
    const mark = /^\s*(`{3,}|~{3,})/.exec(lines[i]);
    if (mark && !fence) fence = mark[1][0];
    else if (mark && fence === mark[1][0]) fence = null;
    const heading = fence ? null : /^#{1,2}[ \t]+(.*)$/.exec(lines[i]);
    if (heading) return entryOf(heading[1].trim(), lines.slice(i + 1));
  }
  return null;
}

/** The single sprint log of before ADR-0011: its Now line, and an entry per `##` heading. */
export function parseSprintLog(text) {
  const body = stripComments(parseFrontmatter(text).body);
  const entries = sections(body)
    .filter((s) => s.title)
    .map((s) => entryOf(s.title, s.lines));
  return { now: nowLine(body), entries };
}

/** The log files of a project, newest wave first: `docs/board/log/wave-0012.md`. */
export function waveFiles(paths) {
  return paths
    .map((path) => ({ path, wave: /^docs\/board\/log\/wave-(\d+)\.md$/.exec(path)?.[1] }))
    .filter((file) => file.wave)
    .sort((a, b) => Number(b.wave) - Number(a.wave))
    .map((file) => file.path);
}

export function parseProgress(text) {
  const { data, body } = parseFrontmatter(text);
  const all = sections(stripComments(body));
  const owner = bullets(section(all, 'blockedontheowner')?.lines ?? []).filter((item) => !isSlot(item));
  const where = (section(all, 'whereweare')?.lines ?? []).join('\n').trim().split(/\n\s*\n/)[0] ?? '';
  return {
    meta: { status: plain(data.status), updated: data.updated ?? '', updatedBy: data.updated_by ?? '' },
    where: isSlot(where) ? '' : where.replace(/\s*\n\s*/g, ' '),
    owner: owner.every((item) => /^nothing\b/i.test(plain(item))) ? [] : owner,
  };
}

/** `S-012.3` belongs to `S-012`; the task card `T-012.3` belonged to `ST-012`. */
export const sprintOf = (id) => {
  const story = /^(S|T)-(\d+)\./.exec(id ?? '');
  if (story) return `${story[1] === 'S' ? 'S' : 'ST'}-${story[2]}`;
  return matches(id, SPRINT_ID)[0] ?? '';
};
