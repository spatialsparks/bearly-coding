// Markdown to safe HTML: the subset the context files are written in - frontmatter, headings,
// paragraphs, lists, task lists, tables, quotes, fenced code, rules and source comments.
// Anything else stays readable as plain text. Raw HTML in a document is shown, never executed.

import { esc } from './html.mjs';
import { renderInline } from './inline.mjs';

// Each of these has exactly one way to match a line, so no input can make one of them crawl.
const FENCE = /^(\s*)(`{3,}|~{3,})([^`]*)$/;
const HEADING = /^ {0,3}(#{1,6})[ \t]+(.*)$/;
const MAX_DEPTH = 12; // quotes in lists in quotes: deeper than this is shown as plain text
const RULE = /^ {0,3}([-*_])(?:\s*\1){2,}\s*$/;
const ITEM = /^(\s*)([-*+]|\d{1,9}[.)])(?:\s+(.*))?$/;
const QUOTE = /^ {0,3}>\s?(.*)$/;
const DELIMITER = /^:?-+:?$/;
const COMMENT = /^\s*<!--/;

/** `---` frontmatter of plain `key: value` lines; a value may run on over indented lines. */
export function parseFrontmatter(text) {
  const source = String(text ?? '')
    .replace(/^﻿/, '')
    .replace(/\r\n?/g, '\n');
  const block = /^---\n([\s\S]*?)\n---[ \t]*(?:\n|$)/.exec(source);
  if (!block) return { data: {}, body: source };
  const data = {};
  let key = null;
  for (const line of block[1].split('\n')) {
    const pair = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line);
    if (pair) {
      key = pair[1];
      data[key] = scalar(pair[2]);
    } else if (key && /^\s+\S/.test(line)) {
      data[key] = `${data[key]} ${line.trim()}`.trim();
    }
  }
  return { data, body: source.slice(block[0].length) };
}

function scalar(value) {
  const quoted = /^(['"])(.*?)\1\s*(?:#.*)?$/.exec(value);
  return quoted ? quoted[2] : value.replace(/(^|\s)#.*$/, '').trim();
}

/** Cells of a table row. A pipe inside a cell is written `\|`, as GitHub requires. */
export function splitRow(line) {
  let row = line.trim();
  if (row.startsWith('|')) row = row.slice(1);
  if (row.endsWith('|') && !row.endsWith('\\|')) row = row.slice(0, -1);
  return row.split(/(?<!\\)\|/).map((cell) => cell.trim().replace(/\\\|/g, '|'));
}

export const isTableStart = (line, next) =>
  line !== undefined &&
  next !== undefined &&
  line.includes('|') &&
  splitRow(next).every((cell) => DELIMITER.test(cell)) &&
  splitRow(next).length === splitRow(line).length;

/** Source comments hold notes for writers; a parser reading the document's data skips them. */
export const stripComments = (text) => String(text ?? '').replace(/<!--[\s\S]*?-->/g, '');

export function renderMarkdown(text, ctx = {}) {
  const { data, body } = parseFrontmatter(text);
  const state = { ctx, ids: new Map(), depth: 0 };
  try {
    return { data, html: blocks(body.split('\n'), state).map((b) => b.html).join('\n') };
  } catch {
    // Whatever a document does to the renderer, the reader still gets its text.
    return { data, html: `<pre class="source">${esc(body)}</pre>` };
  }
}

function blocks(lines, state) {
  if (state.depth > MAX_DEPTH) return [{ type: 'paragraph', html: `<p>${esc(lines.join('\n'))}</p>` }];
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i += 1;
    } else if (COMMENT.test(line)) {
      const start = i;
      while (i < lines.length && !lines[i].includes('-->')) i += 1;
      i += 1;
      const note = lines.slice(start, i).join('\n').replace(/^\s*<!--\s?/, '').replace(/\s*-->[\s\S]*$/, '');
      out.push({
        type: 'comment',
        html: `<details class="md-comment"><summary>Note in the source</summary><pre>${esc(note)}</pre></details>`,
      });
    } else if (FENCE.test(line)) {
      const [, indent, marker, info] = FENCE.exec(line);
      const language = info.trim().split(/\s+/)[0];
      const closing = new RegExp(`^\\s*${marker[0]}{${marker.length},}\\s*$`);
      const body = [];
      i += 1;
      while (i < lines.length && !closing.test(lines[i])) {
        body.push(lines[i].startsWith(indent) ? lines[i].slice(indent.length) : lines[i]);
        i += 1;
      }
      i += 1;
      out.push({ type: 'code', html: codeBlock(body.join('\n'), language) });
    } else if (HEADING.test(line)) {
      const [, hashes, rest] = HEADING.exec(line);
      const level = hashes.length;
      const title = headingTitle(rest);
      const id = unique(state, slug(title));
      out.push({ type: 'heading', html: `<h${level} id="${esc(id)}">${renderInline(title, state.ctx)}</h${level}>` });
      i += 1;
    } else if (RULE.test(line)) {
      out.push({ type: 'rule', html: '<hr>' });
      i += 1;
    } else if (QUOTE.test(line)) {
      const quoted = [];
      while (i < lines.length && QUOTE.test(lines[i])) {
        quoted.push(QUOTE.exec(lines[i])[1]);
        i += 1;
      }
      out.push({ type: 'quote', html: `<blockquote>${nested(quoted, state)}</blockquote>` });
    } else if (isTableStart(line, lines[i + 1])) {
      const end = tableEnd(lines, i + 2);
      out.push({ type: 'table', html: table(lines.slice(i, end), state) });
      i = end;
    } else if (ITEM.test(line)) {
      const found = list(lines, i, state);
      out.push({ type: 'list', html: found.html });
      i = found.end;
    } else {
      const para = [line.trimStart()];
      i += 1;
      while (i < lines.length && lines[i].trim() && !startsBlock(lines[i], lines[i + 1])) {
        para.push(lines[i].trimStart());
        i += 1;
      }
      out.push({ type: 'paragraph', html: `<p>${renderInline(para.join('\n'), state.ctx)}</p>` });
    }
  }
  return out;
}

/** A closing run of #s set off by a space is decoration: `## Title ##`. */
function headingTitle(rest) {
  const title = rest.trimEnd();
  let end = title.length;
  while (end > 0 && title[end - 1] === '#') end -= 1;
  const decorated = end < title.length && (end === 0 || /\s/.test(title[end - 1]));
  return decorated ? title.slice(0, end).trimEnd() : title;
}

const nested = (lines, state) =>
  blocks(lines, { ...state, depth: state.depth + 1 })
    .map((b) => b.html)
    .join('\n');

// What may interrupt a paragraph. An ordered list only when it starts at 1, as in CommonMark,
// so a wrapped line that begins with a year and a full stop stays in its paragraph.
function startsBlock(line, next) {
  if (FENCE.test(line) || HEADING.test(line) || RULE.test(line) || QUOTE.test(line)) return true;
  if (COMMENT.test(line) || isTableStart(line, next)) return true;
  const item = ITEM.exec(line);
  return Boolean(item) && (!/\d/.test(item[2]) || /^1[.)]$/.test(item[2]));
}

function codeBlock(code, language) {
  const lang = language ? ` data-lang="${esc(language)}"` : '';
  return `<div class="code"><button type="button" class="copy" data-copy>Copy</button><pre><code${lang}>${esc(code)}</code></pre></div>`;
}

function tableEnd(lines, from) {
  let end = from;
  while (end < lines.length && lines[end].trim() && lines[end].includes('|')) end += 1;
  return end;
}

function table(lines, state) {
  const head = splitRow(lines[0]);
  const aligns = splitRow(lines[1]).map((cell) =>
    cell.startsWith(':') && cell.endsWith(':') ? 'center' : cell.endsWith(':') ? 'right' : '',
  );
  const cell = (tag, text, n) =>
    `<${tag}${aligns[n] ? ` class="${aligns[n]}"` : ''}>${renderInline(text ?? '', state.ctx)}</${tag}>`;
  const rows = lines.slice(2).map((line) => {
    const cells = splitRow(line);
    return `<tr>${head.map((_, n) => cell('td', cells[n], n)).join('')}</tr>`;
  });
  return `<div class="table"><table><thead><tr>${head.map((text, n) => cell('th', text, n)).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
}

const indentOf = (line) => line.length - line.trimStart().length;

function list(lines, start, state) {
  const first = ITEM.exec(lines[start]);
  const base = first[1].length;
  const ordered = /\d/.test(first[2]);
  const sibling = (line) => {
    const item = line === undefined ? null : ITEM.exec(line);
    const near = item && item[1].length >= base && item[1].length <= base + 1;
    return near && /\d/.test(item[2]) === ordered && !RULE.test(line) ? item : null;
  };

  const items = [];
  let i = start;
  while (sibling(lines[i])) {
    const item = sibling(lines[i]);
    const column = item[1].length + item[2].length + 1; // where the item's own text starts
    const body = [item[3] ?? ''];
    let loose = false;
    i += 1;
    while (i < lines.length) {
      const line = lines[i];
      if (!line.trim()) {
        // A blank line belongs to the item only if what follows is indented into it.
        let j = i;
        while (j < lines.length && !lines[j].trim()) j += 1;
        if (j >= lines.length || indentOf(lines[j]) < Math.min(column, base + 2)) break;
        loose = true;
        for (; i < j; i += 1) body.push(''); // the whole blank run at once
      } else if (indentOf(line) >= base + 2) {
        body.push(line.slice(Math.min(column, indentOf(line))));
        i += 1;
      } else if (ITEM.test(line)) {
        break; // the next item of this list, or the start of another one
      } else if (!startsBlock(line, lines[i + 1]) && body[body.length - 1] !== '') {
        body.push(line.trim()); // a continuation line that was not indented
        i += 1;
      } else {
        break;
      }
    }
    items.push({ number: ordered ? Number.parseInt(item[2], 10) : null, body, loose });
    let j = i;
    while (j < lines.length && !lines[j].trim()) j += 1;
    if (!sibling(lines[j])) break;
    i = j;
  }

  const rendered = items.map((item) => listItem(item, state));
  const tag = ordered ? 'ol' : 'ul';
  const from = ordered && items[0].number !== 1 ? ` start="${items[0].number}"` : '';
  return { end: i, html: `<${tag}${from}>${rendered.join('')}</${tag}>` };
}

function listItem(item, state) {
  const task = /^\[([ xX])\]\s+/.exec(item.body[0]);
  const body = task ? [item.body[0].slice(task[0].length), ...item.body.slice(1)] : item.body;
  const inner = blocks(body, { ...state, depth: state.depth + 1 })
    .map((b) => (b.type === 'paragraph' && !item.loose ? b.html.slice(3, -4) : b.html))
    .join('\n');
  const box = task ? `<input type="checkbox" disabled${task[1] === ' ' ? '' : ' checked'}> ` : '';
  // A numbered item at the top of a document can be linked to: "directive 29" lands on n-29.
  const anchor =
    item.number !== null && state.depth === 0
      ? ` value="${item.number}" id="${esc(unique(state, `n-${item.number}`))}"`
      : '';
  return `<li${anchor}${task ? ' class="task"' : ''}>${box}${inner}</li>`;
}

/** GitHub's heading anchors: lower case, punctuation dropped, spaces to hyphens. */
export const slug = (title) =>
  title
    .toLowerCase()
    .replace(/[`*_~[\]()]/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-');

function unique(state, id) {
  const seen = state.ids.get(id) ?? 0;
  state.ids.set(id, seen + 1);
  return seen ? `${id}-${seen + 1}` : id;
}
