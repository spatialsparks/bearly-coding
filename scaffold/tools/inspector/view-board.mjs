// The board view: four columns of cards, what waits on the owner, the sprints and the last
// waves, and a drawer with the card that was clicked.

import { fileRoute, resolver } from './files.mjs';
import { html, raw } from './html.mjs';
import { renderInline } from './inline.mjs';
import { renderMarkdown } from './markdown.mjs';

const STATE = {
  building: 'building',
  returned: 'returned for a retry',
  checking: 'being read',
  checked: 'verified, integrating next',
  'handed-back': 'handed back',
  merged: 'merged',
  committed: 'committed',
  blocked: 'blocked',
};
const TONE = { checking: 'accent', checked: 'accent', 'handed-back': 'accent', merged: 'success', committed: 'success', returned: 'warning', blocked: 'warning' };
const FOLD_AFTER = 10; // a long Ready list shows its top, the rest behind a click

// The words of the board. Before ADR-0011 a sprint was called a story, a story a task card,
// and a wave a sprint; a board still written that way is shown in its own words.
const WORDS = {
  sprints: {
    parent: 'Sprint', parents: 'Sprints', counted: 'Stories done', wave: 'wave', waves: 'Latest waves',
    idle: 'No wave is being built.', filter: 'Filter cards by id, title or sprint', older: 'in the log.',
  },
  stories: {
    parent: 'Story', parents: 'Stories', counted: 'Tasks done', wave: 'sprint', waves: 'Latest sprints',
    idle: 'No sprint in flight.', filter: 'Filter cards by id, title or story', older: 'in the sprint log.',
  },
};

const plainTitle = (text) => raw(renderInline(text ?? '', { noLinks: true }));
const cardRoute = (id) => `#/board/${encodeURIComponent(id)}`;

function clock(seconds) {
  const when = new Date(seconds * 1000);
  const time = when.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return when.toDateString() === new Date().toDateString() ? time : `${when.toLocaleDateString()} ${time}`;
}

export function boardView(model, ui, selected) {
  if (!model.hasBoard) {
    return html`<main class="empty">
      <h2>No board in this project yet</h2>
      <p>The inspector reads <code>docs/board/BOARD.md</code>, and there is none. The
        <a href="#/files">context files</a> are still here to read.</p>
    </main>`;
  }
  const { columns: cols, board } = model;
  const words = WORDS[board.shape] ?? WORDS.sprints;
  const linked = { resolve: resolver(model.index, 'docs/board/BOARD.md') };
  const waiting = cols.waiting.ready.length + cols.waiting.blocked.length + cols.waiting.backlog.length + cols.waiting.unlisted.length;
  const idle = board.meta.currentWave !== null || (board.shape === 'stories' && cols.sprint) ? null : words.idle;
  const card = (item) => cardOf(item, words);

  return html`<main class="board${selected.id ? ' with-drawer' : ''}">
    <div class="main">
      ${model.log.now ? html`<p class="now">${raw(renderInline(model.log.now, linked))}</p>` : ''}
      ${owner(model, linked)}
      <div class="toolbar">
        <input type="search" data-filter aria-label="Filter cards" placeholder="${words.filter}" value="${ui.filter}">
      </div>
      <div class="columns">
        ${column('Waiting', waiting, [
          lane('Ready — the top is next', cols.waiting.ready, card),
          lane('Blocked', cols.waiting.blocked, card),
          lane('Backlog — not ready yet', cols.waiting.backlog, card),
          lane('Not on the board yet', cols.waiting.unlisted, card),
        ])}
        ${column('In progress', cols.progress.length, cols.progress.length ? cols.progress.map(card) : note(idle ?? 'No agent is building right now.'))}
        ${column('In review', cols.review.length, cols.review.length ? cols.review.map(card) : note(idle ?? 'Nothing is being checked right now.'))}
        ${column('Done', cols.done.length + cols.doneOlder, [
          cols.done.map(card),
          cols.doneOlder ? note(`${cols.doneOlder} older, ${words.older}`) : '',
          cols.done.length + cols.doneOlder ? '' : note('Nothing is done yet.'),
        ])}
      </div>
      ${sprints(model, linked, words)}
      ${waves(model, linked, words)}
    </div>
    ${selected.id ? drawer(model, selected, words) : ''}
  </main>`;
}

const note = (text) => html`<p class="note">${text}</p>`;

const column = (title, count, body) =>
  html`<section class="column"><h2>${title} <span class="count">${count}</span></h2>${body}</section>`;

function lane(title, items, card) {
  if (!items.length) return '';
  const top = items.slice(0, FOLD_AFTER);
  const rest = items.slice(FOLD_AFTER);
  return html`<div class="lane" data-box>
    <h3>${title} <span class="count">${items.length}</span></h3>
    ${top.map(card)}
    ${rest.length ? html`<details class="more" data-more><summary>${rest.length} more</summary>${rest.map(card)}</details>` : ''}
  </div>`;
}

function owner(model, linked) {
  const { owner: waits } = model.progress;
  if (!waits.length) return '';
  return html`<section class="owner">
    <h2>${waits.length === 1 ? '1 thing waits on you' : `${waits.length} things wait on you`}</h2>
    <ul>${waits.map((item) => html`<li>${raw(renderInline(item, linked))}</li>`)}</ul>
  </section>`;
}

function cardOf(item, words) {
  const href = item.id ? cardRoute(item.id) : item.file ? fileRoute(item.file) : null;
  const search = [item.id, item.title, item.parent, item.model, item.note].join(' ').toLowerCase();
  const waitsFor = item.deps.filter((dep) => !dep.done).map((dep) => dep.id);
  const body = html`
    <span class="line">
      <span class="id">${item.id || 'new'}</span>
      ${item.solo ? html`<span class="chip">solo</span>` : ''}
      ${item.model ? html`<span class="chip">${item.model}</span>` : ''}
    </span>
    <span class="title">${plainTitle(item.title)}</span>
    ${item.live ? liveTag(item.live) : ''}
    ${waitsFor.length ? html`<span class="tag">waits for ${waitsFor.join(', ')}</span>` : ''}
    ${item.lane === 'blocked' && item.needs ? html`<span class="tag warning">needs: ${plainTitle(item.needs)}</span>` : ''}
    ${item.lane === 'backlog' && item.missing ? html`<span class="meta">missing: ${plainTitle(item.missing)}</span>` : ''}
    ${item.note ? html`<span class="tag">${item.note}</span>` : ''}
    ${item.lane === 'done' ? html`<span class="meta">${[item.wave && `${words.wave} ${item.wave}`, item.pr].filter(Boolean).join(' · ')}</span>` : ''}`;
  return href
    ? html`<a class="card" href="${href}" data-search="${search}">${body}</a>`
    : html`<div class="card" data-search="${search}">${body}</div>`;
}

function liveTag(live) {
  const facts = [];
  if (live.source === 'git') {
    if (live.commits) facts.push(live.commits === 1 ? '1 commit' : `${live.commits} commits`);
    if (live.commits && live.time) facts.push(clock(live.time));
  } else {
    facts.push('as the board says');
  }
  const placed = live.state === 'merged' || live.state === 'committed';
  const label = `${STATE[live.state] ?? live.state}${placed ? ` ${live.detail}` : ''}`;
  return html`<span class="tag ${TONE[live.state] ?? ''}${live.running ? ' running' : ''}">${label}</span>
    ${facts.length ? html`<span class="meta">${facts.join(' · ')}</span>` : ''}`;
}

function sprints(model, linked, words) {
  const { sprints: rows, milestones } = model.board;
  if (!rows.length) return '';
  const md = (text) => raw(renderInline(text ?? '', linked));
  const grouped = rows.some((row) => row.milestone); // a column only boards of before ADR-0011 have
  // landed and built are finished; waiting is the owner's turn; the rest of the way is in between.
  const TONES = { done: 'success', landed: 'success', built: 'success', waiting: 'warning', 'in progress': 'accent', reviewed: 'accent' };
  const tone = (status) => TONES[status] ?? '';
  return html`<section class="panel">
    <h2>${words.parents}</h2>
    <div class="table"><table>
      <thead><tr><th>${words.parent}</th><th>Title</th>${grouped ? html`<th>Milestone</th>` : ''}<th>Status</th><th>${words.counted}</th></tr></thead>
      <tbody>${rows.map(
        (row) => html`<tr>
          <td class="id">${md(row.label)}</td>
          <td>${md(row.title)}</td>
          ${grouped ? html`<td>${row.milestone}</td>` : ''}
          <td><span class="pill ${tone(row.status)}">${row.status}</span></td>
          <td>${row.progress && row.progress.total ? html`<progress max="${row.progress.total}" value="${row.progress.done}"></progress> ` : ''}${md(row.storiesDone)}</td>
        </tr>`,
      )}</tbody>
    </table></div>
    ${milestones.length
      ? html`<details class="more"><summary>Milestones</summary><div class="table"><table>
          <thead><tr><th>Milestone</th><th>Delivers</th><th>Stories</th><th>Done when</th></tr></thead>
          <tbody>${milestones.map((m) => html`<tr><td>${m.name}</td><td>${md(m.delivers)}</td><td>${md(m.stories)}</td><td>${md(m.doneWhen)}</td></tr>`)}</tbody>
        </table></div></details>`
      : ''}
  </section>`;
}

function waves(model, linked, words) {
  const entries = model.log.entries.slice(0, 3);
  if (!entries.length) return '';
  const pr = (entry) =>
    entry.pr && model.project.remote
      ? html` · <a href="${model.project.remote}/pull/${entry.pr}" target="_blank" rel="noopener noreferrer">pull request ${entry.pr}</a>`
      : '';
  // Today the log is a file per wave, and the newest one is the way in; before, it was one file.
  const whole = model.log.count
    ? html`<a href="${fileRoute(model.log.file)}">${model.log.count === 1 ? 'The one wave in the log' : `The newest of ${model.log.count} waves in the log`}</a>`
    : model.log.file
      ? html`<a href="${fileRoute(model.log.file)}">The whole sprint log</a>`
      : '';
  return html`<section class="panel">
    <h2>${words.waves}</h2>
    ${entries.map(
      (entry) => html`<article class="sprint">
        <h3>${entry.name}<span class="meta">${[entry.sprint, entry.date, entry.result].filter(Boolean).join(' · ')}${pr(entry)}</span></h3>
        <ul>${entry.items.map((item) => html`<li>${item.label ? html`<strong>${item.label}</strong> ` : ''}${raw(renderInline(item.text, linked))}</li>`)}</ul>
      </article>`,
    )}
    ${whole ? html`<p>${whole}</p>` : ''}
  </section>`;
}

function drawer(model, { card: item, text, id }, words) {
  const close = html`<a class="close" href="#/board">Close</a>`;
  if (!item) return html`<aside class="drawer" data-scroll="drawer">${close}<p class="note">No card ${id} on the board.</p></aside>`;
  const ctx = { resolve: resolver(model.index, item.file ?? 'docs/board/BOARD.md') };
  const md = (value) => raw(renderInline(value ?? '', ctx));
  const fact = (label, value) => (value ? html`<dt>${label}</dt><dd>${value}</dd>` : '');
  const live = item.live;
  const pull = /^#?(\d+)$/.exec(item.pr ?? '');
  return html`<aside class="drawer" data-scroll="drawer">
    ${close}
    <h2><span class="id">${item.id}</span> ${md(item.title)}</h2>
    <dl class="facts">
      ${fact(words.parent, item.parent && item.parent !== item.id ? md(item.parent) : '')}
      ${fact('State', live ? html`${STATE[live.state] ?? live.state}${live.detail ? ` — ${live.detail}` : ''}${live.source === 'board' ? ' (the board says so; git cannot tell)' : ''}` : '')}
      ${fact('Branch', live?.branch || item.branch ? html`<code>${live?.branch || item.branch}</code>` : '')}
      ${fact('Model', item.model)}
      ${fact('Solo', item.lane === 'ready' || item.lane === 'wave' ? (item.solo ? 'yes — it runs alone' : 'no') : '')}
      ${fact('Depends on', item.deps.length ? item.deps.map((dep, n) => html`${n ? ', ' : ''}${md(dep.id)}${dep.done ? ' ✓' : ' (not done)'}`) : '')}
      ${fact('Owned paths', item.ownedPaths ? md(item.ownedPaths) : '')}
      ${fact('Why', item.why ? md(item.why) : '')}
      ${fact('Needs', item.needs ? md(item.needs) : '')}
      ${fact('Missing', item.missing ? md(item.missing) : '')}
      ${fact('Done in', item.lane === 'done' ? html`${item.wave ? `${words.wave} ${item.wave}` : ''}${pull && model.project.remote ? html` · <a href="${model.project.remote}/pull/${pull[1]}" target="_blank" rel="noopener noreferrer">pull request ${pull[1]}</a>` : item.pr ? ` · ${item.pr}` : ''}` : '')}
      ${fact('Note', item.note)}
    </dl>
    ${item.file ? html`<p><a href="${fileRoute(item.file)}">Open its file in Files</a></p>` : ''}
    ${text
      ? html`<article class="md">${raw(renderMarkdown(text, ctx).html)}</article>`
      : html`<p class="note">${item.file ? 'Its file could not be read.' : 'It has no file of its own: the row on the board is all there is.'}</p>`}
  </aside>`;
}
