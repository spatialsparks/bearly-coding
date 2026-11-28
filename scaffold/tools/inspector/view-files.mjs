// The files view: the context files grouped by what they are for, and one of them rendered.

import { fileRoute, groups, hints, resolver } from './files.mjs';
import { html, raw } from './html.mjs';
import { renderMarkdown } from './markdown.mjs';

export function filesView(model, ui, { path, text }) {
  return html`<main class="files">
    <nav class="tree" data-scroll="tree" aria-label="Context files">
      <input type="search" data-filter aria-label="Filter files" placeholder="Filter files" value="${ui.filter}">
      ${groups(model.paths).map((group) => treeGroup(group, model, ui, path))}
    </nav>
    <section class="doc" data-scroll="doc">${path ? reader(model, ui, path, text) : overview(model)}</section>
  </main>`;
}

function treeGroup(group, model, ui, current) {
  const open = ui.open.has(group.title) || group.items.some((item) => item.path === current);
  // Stories sit under their sprint's folder; every other group is a flat list.
  const folders = [];
  for (const item of group.items) {
    const last = folders[folders.length - 1];
    if (last && last.name === item.folder) last.items.push(item);
    else folders.push({ name: item.folder, items: [item] });
  }
  return html`<details data-group="${group.title}" data-box ${open ? 'open' : ''}>
    <summary>${group.title} <span class="count">${group.items.length}</span></summary>
    ${folders.map(
      (folder) => html`<div data-box>
        ${folder.name ? html`<div class="folder">${folder.name}</div>` : ''}
        ${folder.items.map((item) => treeItem(item, model, current))}
      </div>`,
    )}
  </details>`;
}

function treeItem(item, model, current) {
  const file = model.byPath.get(item.path);
  return html`<a class="file${item.path === current ? ' current' : ''}" href="${fileRoute(item.path)}" data-search="${item.path.toLowerCase()}" title="${item.path}">
    <span class="label">${item.label}</span>
    ${file.slots ? html`<span class="badge warning">${file.slots} unfilled</span>` : ''}
  </a>`;
}

function overview(model) {
  const flagged = model.files
    .map((file) => ({ file, found: hints(file) }))
    .filter((entry) => entry.found.length);
  return html`<div class="doc-head"><h1>Context files</h1></div>
    <p class="note">${model.files.length} files. Pick one on the left; ids, ADRs, directives and paths inside them are links.</p>
    <h2>Worth a second look</h2>
    ${flagged.length
      ? html`<ul class="hints">${flagged.map(
          ({ file, found }) => html`<li><a href="${fileRoute(file.path)}">${file.path}</a> — ${found.map((hint) => hint.text).join('; ')}</li>`,
        )}</ul>`
      : html`<p class="note">No placeholder is left unfilled.</p>`}`;
}

function reader(model, ui, path, text) {
  const file = model.byPath.get(path);
  if (!file || text === null) {
    return html`<div class="doc-head"><h1>${path}</h1></div>
      <p class="note">This is not a file the inspector serves, or it has just been removed.</p>`;
  }
  const found = hints(file);
  const markdown = path.endsWith('.md');
  const rendered = markdown && !ui.raw ? renderMarkdown(text, { resolve: resolver(model.index, path) }) : null;
  const data = Object.entries(rendered?.data ?? {});
  return html`<div class="doc-head">
      <h1>${path}</h1>
      <span class="meta">${file.lines} lines</span>
      ${found.map((hint) => html`<span class="pill warning">${hint.text}</span>`)}
      ${markdown ? html`<button type="button" data-raw>${ui.raw ? 'Show rendered' : 'Show source'}</button>` : ''}
    </div>
    ${data.length ? html`<p class="frontmatter">${data.map(([key, value]) => html`<span class="pill"><b>${key}</b> ${value}</span>`)}</p>` : ''}
    ${rendered ? html`<article class="md">${raw(rendered.html)}</article>` : html`<pre class="source">${text}</pre>`}`;
}
