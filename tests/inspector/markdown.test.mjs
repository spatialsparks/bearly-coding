import assert from 'node:assert/strict';
import test from 'node:test';

import { renderInline } from '../../scaffold/tools/inspector/inline.mjs';
import { parseFrontmatter, renderMarkdown, splitRow, stripComments } from '../../scaffold/tools/inspector/markdown.mjs';

const md = (text, ctx) => renderMarkdown(text, ctx).html;

// Every tag the renderer is allowed to produce. Anything else in its output came from the
// document, which is exactly what must never happen.
const ALLOWED = new Set(
  'a blockquote br button code del details div em h1 h2 h3 h4 h5 h6 hr input li ol p pre span strong summary table tbody td th thead tr ul'.split(' '),
);
const tagsIn = (markup) => [...markup.matchAll(/<\/?([a-zA-Z][\w-]*)/g)].map((m) => m[1].toLowerCase());

test('raw HTML in a document is shown, never emitted', () => {
  const hostile = [
    '<script>alert(1)</script>',
    '<img src=x onerror=alert(1)>',
    'text <iframe src="https://a.test"></iframe> more',
    '- <svg onload=alert(1)>',
    '| a |\n| --- |\n| <b onclick=x>cell</b> |',
    '> <style>*{display:none}</style>',
    '# <marquee>title</marquee>',
    '`<script>in code</script>`',
    '```<script>\n</code></pre><script>alert(1)</script>\n```',
  ];
  for (const source of hostile) {
    const out = md(source);
    for (const tag of tagsIn(out)) assert.ok(ALLOWED.has(tag), `${tag} leaked from: ${source}`);
    assert.ok(!/<[^>]*\son\w+=/.test(out), `an event handler leaked from: ${source}`);
  }
});

test('only http, https and mailto become links', () => {
  for (const href of ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'data:text/html,<b>x</b>', 'vbscript:x', 'file:///c:/x']) {
    const out = md(`[click](${href}) and ![img](${href})`);
    assert.ok(!/<a\b/.test(out), `${href} became a link: ${out}`);
    assert.ok(out.includes('class="dead"'));
  }
  assert.match(md('[site](https://a.test/x)'), /<a href="https:\/\/a\.test\/x" target="_blank" rel="noopener noreferrer">site<\/a>/);
  assert.match(md('<mailto:a@b.test>'), /<a href="mailto:a@b\.test"/);
});

test('a link cannot break out of its attribute', () => {
  const attributes = (markup) => [...markup.matchAll(/<a\s([^>]*)>/g)].map((m) => m[1]);
  for (const source of [
    '[x](https://a.test/"onmouseover="alert(1))',
    '[x](https://a.test "t\\" onclick=\\"alert(1)")',
    '<https://a.test/?q="><script>x</script>>',
    'https://a.test/?a=1&b="x"',
  ]) {
    for (const attrs of attributes(md(source))) {
      const names = [...attrs.matchAll(/(?:^|\s)([\w-]+)=/g)].map((m) => m[1]);
      assert.deepEqual(names.filter((n) => !['href', 'target', 'rel', 'class'].includes(n)), [], source);
    }
    assert.ok(!md(source).includes('<script'), source);
  }
});

test('a NUL in a document cannot forge a placeholder', () => {
  assert.equal(renderInline('\u00000\u0000 and `code`'), '0 and <code>code</code>');
});

test('headings, paragraphs, rules, quotes and source comments', () => {
  const out = md('# One `two`\n\ntext\nmore\n\n---\n\n> quoted\n> > deeper\n\n<!-- a note\nfor writers -->\n\nafter');
  assert.match(out, /<h1 id="one-two">One <code>two<\/code><\/h1>/);
  assert.match(out, /<p>text\nmore<\/p>/);
  assert.match(out, /<hr>/);
  assert.match(out, /<blockquote><p>quoted<\/p>\n<blockquote><p>deeper<\/p><\/blockquote><\/blockquote>/);
  assert.match(out, /<details class="md-comment"><summary>Note in the source<\/summary><pre>a note\nfor writers<\/pre><\/details>/);
  assert.match(out, /<p>after<\/p>/);
});

test('duplicate headings get distinct anchors', () => {
  const out = md('## Tasks\n\n## Tasks');
  assert.match(out, /id="tasks"/);
  assert.match(out, /id="tasks-2"/);
});

test('fenced code is escaped, keeps its language and gets a copy button', () => {
  const out = md('```text\nYou are <the> orchestrator\n  indented\n```\nnext');
  assert.match(out, /<button type="button" class="copy" data-copy>Copy<\/button>/);
  assert.match(out, /<code data-lang="text">You are &lt;the&gt; orchestrator\n {2}indented<\/code>/);
  assert.match(out, /<p>next<\/p>/);
});

test('a line with inline backticks is not mistaken for a fence', () => {
  assert.match(md('``` x ` y ```'), /^<p>/);
});

test('lists nest, continue across wrapped lines and keep their numbers', () => {
  const out = md(
    [
      '1. **Independence is computed.** A task joins only if',
      '   - every dependency is `done`;',
      '   - its paths overlap no other,',
      '     compared as globs.',
      '',
      '   If unsure, it waits.',
      '2. **Shared files are owned paths too.**',
      '',
      'A paragraph after the list.',
    ].join('\n'),
  );
  assert.equal([...out.matchAll(/<li value="\d+"/g)].length, 2, out);
  assert.match(out, /<li value="1" id="n-1">/);
  assert.match(out, /<li value="2" id="n-2">/);
  assert.match(out, /<ul><li>every dependency is <code>done<\/code>;<\/li><li>its paths overlap no other,\ncompared as globs\.<\/li><\/ul>/);
  assert.match(out, /<p>If unsure, it waits\.<\/p>/);
  assert.match(out, /<\/ol>\n<p>A paragraph after the list\.<\/p>/);
});

test('an ordered list keeps the number it starts at', () => {
  const out = md('10. ten\n11. eleven\n    continued');
  assert.match(out, /<ol start="10"><li value="10" id="n-10">ten<\/li><li value="11" id="n-11">eleven\ncontinued<\/li><\/ol>/);
});

test('a wrapped line that starts with a number does not open a list', () => {
  assert.equal([...md('It was decided in\n2026. Then nothing.').matchAll(/<ol/g)].length, 0);
});

test('task lists show their boxes', () => {
  const out = md('- [ ] open\n- [x] closed');
  assert.match(out, /<li class="task"><input type="checkbox" disabled> open<\/li>/);
  assert.match(out, /<li class="task"><input type="checkbox" disabled checked> closed<\/li>/);
});

test('tables split on unescaped pipes only, and pad short rows', () => {
  const out = md('| Task | Owned paths |\n| :--- | ---: |\n| T-1.1 | `a\\|b` and c \\| d |\n| short |');
  assert.match(out, /<th>Task<\/th><th class="right">Owned paths<\/th>/);
  assert.match(out, /<td>T-1\.1<\/td><td class="right"><code>a\|b<\/code> and c \| d<\/td>/);
  assert.match(out, /<td>short<\/td><td class="right"><\/td>/);
  assert.deepEqual(splitRow('| a | b \\| c |'), ['a', 'b | c']);
});

test('a rule under a line with a pipe is not a table', () => {
  assert.match(md('a | b\n---'), /<p>a \| b<\/p>\n<hr>/);
});

test('emphasis respects words, and reaches around code', () => {
  assert.equal(renderInline('a snake_case_name and a_b stay'), 'a snake_case_name and a_b stay');
  assert.equal(renderInline('__init__ is bold, as in CommonMark'), '<strong>init</strong> is bold, as in CommonMark');
  assert.equal(renderInline('**bold**, *em*, _em_ and ~~gone~~'), '<strong>bold</strong>, <em>em</em>, <em>em</em> and <del>gone</del>');
  assert.equal(renderInline('_[ids, or `none`]_'), '<em>[ids, or <code>none</code>]</em>');
  assert.equal(renderInline('2 * 3 * 4'), '2 * 3 * 4');
  assert.equal(renderInline('\\*not em\\*'), '*not em*');
});

test('bare URLs stop before trailing punctuation and quotes', () => {
  assert.match(renderInline('see https://a.test/x.'), /href="https:\/\/a\.test\/x" [^>]*>https:\/\/a\.test\/x<\/a>\.$/);
  assert.match(renderInline('"https://a.test/?a=1&b=2"'), /^&quot;<a href="https:\/\/a\.test\/\?a=1&amp;b=2" [^>]*>https:\/\/a\.test\/\?a=1&amp;b=2<\/a>&quot;$/);
});

test('references are linked through the resolver, once', () => {
  const routes = { 'id:T-012.3': '#/card', 'adr:0005': '#/adr', 'directive:29': '#/dir', 'code:docs/PROGRESS.md': '#/progress', 'link:../x.md': '#/x' };
  const ctx = { resolve: (kind, value) => routes[`${kind}:${value}`] ?? null };
  assert.equal(renderInline('T-012.3 and T-999.9', ctx), '<a class="ref" href="#/card">T-012.3</a> and T-999.9');
  // what waits on the owner is a link to its input, as it stands under "Blocked on the owner"
  const waits = { resolve: (kind, value) => ({ 'id:I-007': '#/input', 'code:I-007': '#/input' })[`${kind}:${value}`] ?? null };
  assert.equal(renderInline('`I-007` a mail provider: holds S-012.4, see I-007 and I-008', waits), '<a class="ref" href="#/input"><code>I-007</code></a> a mail provider: holds S-012.4, see <a class="ref" href="#/input">I-007</a> and I-008');
  // a story and its sprint, in today's words (ADR-0011): the longer id wins, and neither is cut out of a longer word
  const today = { resolve: (kind, value) => ({ 'id:S-012.3': '#/story', 'id:S-012': '#/sprint' })[`${kind}:${value}`] ?? null };
  assert.equal(renderInline('S-012.3 of S-012, not S-012.x, XS-012 or S-0123', today), '<a class="ref" href="#/story">S-012.3</a> of <a class="ref" href="#/sprint">S-012</a>, not <a class="ref" href="#/sprint">S-012</a>.x, XS-012 or S-0123');
  assert.equal(renderInline('see ADR-0005 (directive 29)', ctx), 'see <a class="ref" href="#/adr">ADR-0005</a> (<a class="ref" href="#/dir">directive 29</a>)');
  assert.equal(renderInline('`docs/PROGRESS.md` and `other.md`', ctx), '<a class="ref" href="#/progress"><code>docs/PROGRESS.md</code></a> and <code>other.md</code>');
  assert.equal(renderInline('[about T-012.3](../x.md)', ctx), '<a href="#/x">about T-012.3</a>');
  assert.equal(renderInline('[gone](../missing.md)', ctx), '<span class="dead" title="../missing.md">gone</span>');
  assert.equal(renderInline('T-012.3 [a](../x.md) `docs/PROGRESS.md`', { ...ctx, noLinks: true }), 'T-012.3 a <code>docs/PROGRESS.md</code>');
});

test('frontmatter is read, not rendered', () => {
  const source = "---\nupdated: '2026-01-02'\nupdated_by: 'the orchestrator, sprint 3' # who\nmax_parallel: 3 # most agents\ncurrent_sprint: none # a number while one runs\napplies_to:\n  [\n    'a/**',\n    'b/**',\n  ]\n---\n\n# Title\n";
  const { data, body } = parseFrontmatter(source);
  assert.deepEqual(data, {
    updated: '2026-01-02',
    updated_by: 'the orchestrator, sprint 3',
    max_parallel: '3',
    current_sprint: 'none',
    applies_to: "[ 'a/**', 'b/**', ]",
  });
  assert.equal(body, '\n# Title\n');
  assert.equal(md(source), '<h1 id="title">Title</h1>');
  assert.deepEqual(parseFrontmatter('\uFEFFno frontmatter\r\nhere').body, 'no frontmatter\nhere');
});

test('comments can be stripped for parsers', () => {
  assert.equal(stripComments('a <!-- x\ny --> b <!-- z --> c'), 'a  b  c');
});

// A document must not be able to make the page hang. Each of these took seconds to minutes
// before every scan in the renderer was bounded; the limit here is generous, not tight.
test('no document makes the renderer crawl', () => {
  const growingRuns = Array.from({ length: 90 }, (_, n) => '`'.repeat(n + 1)).join(' ');
  const cases = {
    'brackets, then backtick runs of every length': `${'['.repeat(5000)}${growingRuns} x`,
    'a heading padded with spaces': `# x${' '.repeat(64000)}y`,
    'a heading of hashes': `# ${'#'.repeat(64000)} x`,
    'strong markers that never close': '**a '.repeat(4900),
    'emphasis markers that never close': `${'*a '.repeat(3000)}${'_b '.repeat(3000)}`,
    'a fence line padded with spaces': `\`\`\`${' '.repeat(64000)}\``,
    'blank lines inside a list item': `- item\n${'\n'.repeat(40000)}  more`,
    'quotes nested five thousand deep': `${'>'.repeat(5000)} deep`,
    'lists nested four hundred deep': Array.from({ length: 400 }, (_, n) => `${' '.repeat(n * 2)}- x`).join('\n'),
    'link openers that never close': '[a]('.repeat(4900),
    'one line far too long to be prose': `${'[`*_'.repeat(20000)}`,
    'a table cell of digits': `| a |\n| --- |\n| ${'1'.repeat(64000)} |`,
  };
  for (const [name, source] of Object.entries(cases)) {
    const started = performance.now();
    const out = md(source);
    const took = performance.now() - started;
    assert.ok(took < 1500, `${name}: ${Math.round(took)} ms`);
    for (const tag of tagsIn(out)) assert.ok(ALLOWED.has(tag), `${name}: ${tag}`);
  }
});

test('a run of backticks that opens nothing stays text, whole', () => {
  assert.equal(renderInline('a `` b and `c`'), 'a `` b and <code>c</code>');
  assert.equal(renderInline('```'), '```');
  // as CommonMark reads it: the double run opens nothing, the single one after "a" does
  assert.equal(renderInline('``a` and `b`'), '``a<code>and</code>b`');
});

test('a closing run of hashes is decoration, a hash inside the title is not', () => {
  assert.match(md('## Title ##'), /<h2 id="title">Title<\/h2>/);
  assert.match(md('## C# and F#'), /<h2 id="c-and-f">C# and F#<\/h2>/);
});

test('a resolver cannot make the renderer link outside the page', () => {
  const echo = { resolve: (kind, value) => (kind === 'directive' ? 'javascript:alert(1)' : value) };
  const out = renderInline('`javascript:alert(1)` [x](javascript:alert(1)) T-1.1 directive 9 `https://evil.test/x.md`', echo);
  assert.ok(!/<a\b/.test(out), out);
});
