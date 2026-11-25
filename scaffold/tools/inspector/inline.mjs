// Inline Markdown to safe HTML. The text is escaped before a tag is added, and the only tags
// added are the ones written in this file, so a document can never inject markup of its own.
// Every scan here is bounded, so a document cannot make the page hang either.

import { esc } from './html.mjs';

// Marks where a code span, a link or an escaped character goes back in after the plain text
// around it has been escaped and styled.
const TOKEN = '\u0000';
const CODE_SPAN = /(`+)(?!`)([\s\S]*?)(?<!`)\1(?!`)/y;
const AUTOLINK = /<((?:https?:\/\/|mailto:)[^\s<>]+)>/y;
const BARE_URL = /https?:\/\/[^\s<>\u0000]*[^\s<>\u0000.,;:!?)\]'"*_`]/y;
const DESTINATION =
  /\(\s*(?:<([^<>\n]*)>|((?:[^\s()\\]|\\.|\([^\s()]*\))*))(?:\s+(?:"[^"]*"|'[^']*'))?\s*\)/y;
const PUNCTUATION = /[!-/:-@[-`{-~]/;
// A story, a sprint or an input - and the task card or story of before ADR-0011.
const REFERENCES = /\b((?:S|T)-\d+\.\d+|(?:S|ST|I)-\d+)\b|\b(ADR[- ]?\d{3,4})\b|\b(directives? \d+)\b/g;

const INLINE_LIMIT = 20000; // longer than any real paragraph or cell: shown as it is
const LABEL_LIMIT = 2000; // a link's text is never this long; unbounded, each "[" would scan to the end

/**
 * ctx.resolve(kind, value) returns the route for a reference, or null to leave it as text.
 * ctx.noLinks renders links as their text, for use inside an element that is itself a link.
 */
export function renderInline(source, ctx = {}) {
  if (source.length > INLINE_LIMIT) return esc(source);
  const nodes = [];
  // Backtick runs of these lengths have no closing run further on, so none later can either.
  const dead = new Set();
  let text = '';
  let i = 0;
  while (i < source.length) {
    const found = nodeAt(source, i, dead);
    if (found) {
      nodes.push(found.node);
      text += `${TOKEN}${nodes.length - 1}${TOKEN}`;
      i = found.end;
    } else {
      if (source[i] !== TOKEN) text += source[i]; // a NUL in a document must not forge a token
      i += 1;
    }
  }

  let out = emphasis(esc(text)).replace(/(?: {2,}|\\)\n/g, '<br>\n');
  if (!ctx.noLinks && ctx.resolve) out = references(out, ctx);
  return out.replace(/\u0000(\d+)\u0000/g, (_, n) => renderNode(nodes[Number(n)], ctx));
}

/** The construct that starts at `at`, if there is one: what it is and where it ends. */
function nodeAt(source, at, dead) {
  const ch = source[at];
  if (ch === '\\' && PUNCTUATION.test(source[at + 1] ?? '')) {
    return { end: at + 2, node: { type: 'literal', value: source[at + 1] } };
  }
  if (ch === '`') {
    const code = codeAt(source, at, dead);
    if (code) return { end: at + code[0].length, node: { type: 'code', value: code[2] } };
    // A run that opens no code span is just backticks - the whole run, not one at a time.
    const run = runLength(source, at);
    return { end: at + run, node: { type: 'literal', value: source.slice(at, at + run) } };
  }
  if (ch === '<') {
    const auto = match(AUTOLINK, source, at);
    return auto && { end: at + auto[0].length, node: { type: 'url', href: auto[1] } };
  }
  if (ch === 'h' && !/\w/.test(source[at - 1] ?? '')) {
    const url = match(BARE_URL, source, at);
    return url && { end: at + url[0].length, node: { type: 'url', href: url[0] } };
  }
  if (ch === '[' || (ch === '!' && source[at + 1] === '[')) return linkAt(source, at, dead);
  return null;
}

function match(pattern, source, at) {
  pattern.lastIndex = at;
  return pattern.exec(source);
}

function runLength(source, at) {
  let end = at;
  while (source[end] === '`') end += 1;
  return end - at;
}

/** The code span opening at `at`, looked for only while a closing run can still exist. */
function codeAt(source, at, dead) {
  const run = runLength(source, at);
  if (dead.has(run)) return null;
  const code = match(CODE_SPAN, source, at);
  if (!code) dead.add(run);
  return code;
}

/** Finds `[text](destination "title")` starting at `start`, an image when it begins with `!`. */
function linkAt(source, start, dead) {
  const image = source[start] === '!';
  const open = image ? start + 1 : start;
  const limit = Math.min(source.length, open + LABEL_LIMIT);
  let depth = 0;
  let close = -1;
  for (let i = open; i < limit; i += 1) {
    const ch = source[i];
    if (ch === '\\') {
      i += 1;
    } else if (ch === '`') {
      const code = codeAt(source, i, dead);
      i += (code ? code[0].length : runLength(source, i)) - 1;
    } else if (ch === '[') {
      depth += 1;
    } else if (ch === ']') {
      depth -= 1;
      if (depth === 0) {
        close = i;
        break;
      }
    }
  }
  if (close < 0 || source[close + 1] !== '(') return null;
  const dest = match(DESTINATION, source, close + 1);
  if (!dest) return null;
  return {
    end: close + 1 + dest[0].length,
    node: {
      type: image ? 'image' : 'link',
      text: source.slice(open + 1, close),
      href: (dest[1] ?? dest[2] ?? '').replace(/\\(.)/g, '$1'),
    },
  };
}

// Underscores only count at a word's edge, so snake_case_names stay as they are. A styled run
// is at most 400 characters long, which is what keeps each of these patterns linear.
function emphasis(text) {
  return text
    .replace(/\*\*(?=\S)([\s\S]{0,400}?\S)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^\w*])__(?=\S)([\s\S]{0,400}?\S)__(?![\w])/g, '$1<strong>$2</strong>')
    .replace(/\*(?=[^\s*])([^*]{0,400}?[^\s*])\*/g, '<em>$1</em>')
    .replace(/(^|[^\w_])_(?=[^\s_])([^_]{0,400}?[^\s_])_(?![\w])/g, '$1<em>$2</em>')
    .replace(/~~(?=\S)([\s\S]{0,400}?\S)~~/g, '<del>$1</del>');
}

// A resolver hands back routes inside this page. Anything else it returned is not followed,
// so the links stay safe whatever resolver the renderer is given.
const route = (ctx, kind, value) => {
  const href = ctx.resolve(kind, value);
  return typeof href === 'string' && href.startsWith('#') ? href : null;
};

// Story, sprint and input ids, ADR numbers and directive numbers, in one pass over the text between
// tags, so nothing is linked twice.
function references(markup, ctx) {
  return markup
    .split(/(<[^>]+>)/)
    .map((part) =>
      part.startsWith('<')
        ? part
        : part.replace(REFERENCES, (whole, id, adr, directive) => {
            const href = id
              ? route(ctx, 'id', id)
              : adr
                ? route(ctx, 'adr', adr.replace(/\D/g, ''))
                : route(ctx, 'directive', directive.replace(/\D/g, ''));
            return href ? `<a class="ref" href="${esc(href)}">${whole}</a>` : whole;
          }),
    )
    .join('');
}

function renderNode(node, ctx) {
  if (node.type === 'literal') return esc(node.value);
  if (node.type === 'code') {
    const value = node.value.replace(/\n/g, ' ').replace(/^ (.*\S.*) $/, '$1');
    const code = `<code>${esc(value)}</code>`;
    const href = ctx.resolve && !ctx.noLinks ? route(ctx, 'code', value) : null;
    return href ? `<a class="ref" href="${esc(href)}">${code}</a>` : code;
  }
  if (node.type === 'url') return ctx.noLinks ? esc(node.href) : external(node.href, esc(node.href));
  if (node.type === 'image') {
    return `<span class="image" title="${esc(node.href)}">${esc(node.text || 'image')}</span>`;
  }

  const inner = renderInline(node.text, { ...ctx, noLinks: true });
  if (ctx.noLinks) return inner;
  const href = node.href.trim();
  if (/^(https?:\/\/|mailto:)/i.test(href)) return external(href, inner);
  // Anything else with a scheme - javascript:, data:, file: - is never turned into a link.
  const local = !/^[a-z][a-z0-9+.-]*:/i.test(href) && ctx.resolve ? route(ctx, 'link', href) : null;
  if (local) return `<a href="${esc(local)}">${inner}</a>`;
  return `<span class="dead" title="${esc(href)}">${inner}</span>`;
}

const external = (href, inner) =>
  `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${inner}</a>`;
