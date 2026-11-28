// The page: asks the server beside it for the project's state, keeps that fresh, and shows the
// board or the files. It only ever sends GET requests - there is nothing here that can write.

import { parseBoard, parseProgress, parseSprintLog, parseWave, waveFiles } from './board.mjs';
import { buildIndex, hints } from './files.mjs';
import { html } from './html.mjs';
import { columns } from './live.mjs';
import { boardView } from './view-board.mjs';
import { filesView } from './view-files.mjs';

const POLL_MS = 5000;
// SPRINT_LOG.md is the single log of before ADR-0011; today the log is a file per wave.
const CORE = ['docs/board/BOARD.md', 'docs/board/SPRINT_LOG.md', 'docs/PROGRESS.md'];
const LATEST = 3; // the waves the board shows, and so the only log files it fetches
const STATUS_TONE = { 'on-track': 'success', blocked: 'danger', 'needs-owner': 'warning' };

const app = document.getElementById('app');
const texts = new Map(); // path -> { stamp, text }
const ui = { filter: '', raw: false, open: new Set(['Start here']) };
let model = null;
let signature = '';
let shown = '';

const decode = (part) => {
  try {
    return decodeURIComponent(part);
  } catch {
    return part;
  }
};

function route() {
  const [head, ...rest] = location.hash.replace(/^#\/?/, '').split('/');
  if (head === 'file') {
    const [path, anchor = ''] = rest.join('/').split('@');
    return { view: 'files', path: decode(path), anchor: decode(anchor) };
  }
  if (head === 'files') return { view: 'files', path: '', anchor: '' };
  return { view: 'board', card: decode(rest[0] ?? ''), anchor: '' };
}

async function textOf(path) {
  const file = model.byPath.get(path);
  if (!file) return null;
  const cached = texts.get(path);
  if (cached && cached.stamp === file.mtime) return cached.text;
  const response = await fetch(`/api/file?path=${encodeURIComponent(path)}`, { cache: 'no-store' });
  if (!response.ok) return null;
  const text = (await response.text()).replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  texts.set(path, { stamp: file.mtime, text });
  return text;
}

async function build(state) {
  model = { ...state, paths: state.files.map((file) => file.path), byPath: new Map(state.files.map((file) => [file.path, file])) };
  const [board, log, progress] = await Promise.all(CORE.map(textOf));
  const waves = waveFiles(model.paths);
  const latest = await Promise.all(waves.slice(0, LATEST).map(textOf));
  const single = parseSprintLog(log);
  model.hasBoard = board !== null;
  model.index = buildIndex(model.paths);
  model.board = parseBoard(board);
  model.log = {
    now: model.board.now || single.now,
    entries: [...latest.map(parseWave).filter(Boolean), ...single.entries],
    file: waves.length ? waves[0] : log !== null ? 'docs/board/SPRINT_LOG.md' : null,
    count: waves.length,
  };
  model.progress = parseProgress(progress);
  model.columns = columns({ board: model.board, log: model.log, paths: model.paths, git: state.git });
  model.flagged = state.files.filter((file) => hints(file).length).length;
}

function findCard(id) {
  const { waiting, progress, review, done } = model.columns;
  return [...progress, ...review, ...waiting.ready, ...waiting.blocked, ...waiting.backlog, ...waiting.unlisted, ...done].find((card) => card.id === id) ?? null;
}

function header(where) {
  const { project, board, progress, git, columns: cols } = model;
  const checkout = git?.worktrees.find((worktree) => worktree.main);
  const { currentSprint, currentWave } = board.meta;
  const today = board.shape === 'sprints';
  const inFlight = currentSprint ?? (cols.sprint ? cols.sprint.replace(/^sprint\//, '') : '');
  const flying = today
    ? inFlight && `${inFlight} in flight${currentWave !== null ? `, wave ${currentWave}` : ''}`
    : currentWave !== null ? `sprint ${currentWave} in flight` : cols.sprint ? `${cols.sprint} in flight` : '';
  const current = (view) => (where.view === view ? 'page' : 'false');
  return html`<header class="top">
    <a class="name" href="#/board">${project.name}</a>
    ${progress.meta.status ? html`<span class="pill ${STATUS_TONE[progress.meta.status] ?? ''}">${progress.meta.status.replace(/-/g, ' ')}</span>` : ''}
    ${model.hasBoard ? html`<span class="pill ${flying ? 'accent' : ''}">${flying || 'no sprint in flight'}</span>` : ''}
    ${board.meta.maxParallel ? html`<span class="pill">${board.meta.maxParallel === 1 ? '1 agent at a time' : `${board.meta.maxParallel} agents at most`}</span>` : ''}
    ${board.meta.land === 'ask' ? html`<span class="pill">a sprint lands on your yes</span>` : ''}
    ${checkout ? html`<span class="pill mono">${checkout.branch || 'detached'}</span>` : ''}
    <nav>
      <a href="#/board" aria-current="${current('board')}">Board</a>
      <a href="#/files" aria-current="${current('files')}">Files${model.flagged ? html` <span class="badge warning">${model.flagged}</span>` : ''}</a>
    </nav>
    <span class="tick" id="tick"></span>
  </header>`;
}

async function render() {
  if (!model) return;
  const where = route();
  let body;
  if (where.view === 'files') {
    body = filesView(model, ui, { ...where, text: where.path ? await textOf(where.path) : null });
  } else {
    const card = where.card ? findCard(where.card) : null;
    body = boardView(model, ui, { id: where.card, card, text: card?.file ? await textOf(card.file) : null });
  }

  // Redrawing must not move what the reader is looking at, or take the caret out of the filter.
  const moved = location.hash !== shown;
  const scrolls = [...app.querySelectorAll('[data-scroll]')].map((el) => [el.dataset.scroll, el.scrollTop]);
  const page = window.scrollY;
  const typing = document.activeElement?.matches?.('[data-filter]');
  app.innerHTML = html`${header(where)}${body}`.text;
  document.title = `${model.project.name} — inspector`;
  applyFilter();
  if (typing) {
    const input = app.querySelector('[data-filter]');
    input?.focus();
    input?.setSelectionRange(input.value.length, input.value.length);
  }
  for (const [key, top] of scrolls) {
    const el = app.querySelector(`[data-scroll="${key}"]`);
    if (el && !(moved && key !== 'tree')) el.scrollTop = top;
  }
  window.scrollTo(0, page);
  if (moved && where.anchor) document.getElementById(where.anchor)?.scrollIntoView();
  shown = location.hash;
  tick(true);
}

function applyFilter() {
  const needle = ui.filter.trim().toLowerCase();
  for (const el of app.querySelectorAll('[data-search]')) el.hidden = Boolean(needle) && !el.dataset.search.includes(needle);
  for (const fold of app.querySelectorAll('[data-more]')) if (needle) fold.open = true;
  // Innermost boxes first, so a group empties when all the folders inside it have.
  for (const box of [...app.querySelectorAll('[data-box]')].reverse()) {
    box.hidden = Boolean(needle) && !box.querySelector('[data-search]:not([hidden])');
    if (needle && box.dataset.group) box.open = true;
  }
}

function tick(ok) {
  const el = document.getElementById('tick');
  if (!el) return;
  el.textContent = ok ? `checked ${new Date().toLocaleTimeString()}` : 'the server has stopped — this is the last state it gave';
  el.classList.toggle('stale', !ok);
}

async function refresh() {
  let state;
  try {
    const response = await fetch('/api/state', { cache: 'no-store' });
    if (!response.ok) throw new Error(String(response.status));
    state = await response.json();
  } catch {
    if (model) tick(false);
    else app.innerHTML = html`<p class="boot">The inspector's server is not answering. Start it again with <code>node tools/inspector/serve.mjs</code>.</p>`.text;
    return;
  }
  const next = JSON.stringify(state);
  if (next === signature) {
    tick(true);
    return;
  }
  signature = next;
  try {
    await build(state);
    await render();
  } catch (error) {
    app.innerHTML = html`<p class="boot">The inspector could not read this project: ${error.message}</p>`.text;
  }
}

window.addEventListener('hashchange', () => {
  ui.filter = route().view === shownView() ? ui.filter : '';
  render();
});

const shownView = () => (shown.startsWith('#/file') ? 'files' : 'board');

document.addEventListener('click', async (event) => {
  const copy = event.target.closest?.('[data-copy]');
  if (copy) {
    try {
      await navigator.clipboard.writeText(copy.closest('.code').querySelector('code').textContent);
      copy.textContent = 'Copied';
    } catch {
      copy.textContent = 'Not copied';
    }
    setTimeout(() => (copy.textContent = 'Copy'), 1500);
  } else if (event.target.closest?.('[data-raw]')) {
    ui.raw = !ui.raw;
    render();
  }
});

document.addEventListener('input', (event) => {
  if (!event.target.matches?.('[data-filter]')) return;
  ui.filter = event.target.value;
  // An emptied filter gives the groups back the open and closed state the reader left them in.
  if (ui.filter.trim()) applyFilter();
  else render();
});

// `toggle` does not bubble, hence the capture. While a filter holds groups open, their state
// is the filter's doing, not the reader's, and is not remembered.
document.addEventListener(
  'toggle',
  (event) => {
    const group = event.target.dataset?.group;
    if (!group || ui.filter.trim()) return;
    if (event.target.open) ui.open.add(group);
    else ui.open.delete(group);
  },
  true,
);

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) refresh();
});
setInterval(() => {
  if (!document.hidden) refresh();
}, POLL_MS);
refresh();
