// The context files as a reader sees them: grouped by what they are for, with references
// between them turned into links, and a hint where one still holds a placeholder nobody filled
// in.

// The workflow commands, as against the stack skills that live in the same folder.
const COMMANDS = [
  'standup', 'ideate', 'feature', 'fix', 'refactor', 'implement', 'autopilot',
  'resolve', 'sprint-review', 'project-review', 'retro', 'board', 'kickoff',
  'sprint', 'task', 'next', // before ADR-0011 and ADR-0012
];
const START = ['CLAUDE.md', 'docs/PROGRESS.md', 'docs/board/BOARD.md', 'docs/GLOSSARY.md', 'docs/board/SPRINT_LOG.md'];
const RULES = ['docs/PRIME_DIRECTIVES.md', 'docs/ARCHITECTURE.md'];
const PROTOCOL = ['docs/PLANNING.md', 'docs/AGENT_WORKFLOW.md', 'docs/ORCHESTRATION.md'];

const commandOf = (path) =>
  /^\.claude\/skills\/([^/]+)\/SKILL\.md$/.exec(path)?.[1] ?? /^\.claude\/commands\/([^/]+)\.md$/.exec(path)?.[1];

// First match wins, top to bottom.
const GROUPS = [
  { title: 'Start here', test: (p) => START.includes(p), order: (p) => START.indexOf(p) },
  { title: 'Rules and architecture', test: (p) => RULES.includes(p) || /^docs\/[^/]+\.md$/.test(p) && !PROTOCOL.includes(p) },
  {
    title: 'Protocol and commands',
    test: (p) => PROTOCOL.includes(p) || /^docs\/prompts\//.test(p) || COMMANDS.includes(commandOf(p)) || /^\.claude\/commands\//.test(p),
    label: (p) => (commandOf(p) ? `/${commandOf(p)}` : null),
  },
  { title: 'Decisions', test: (p) => /^docs\/(adr|decisions)\//.test(p) },
  { title: 'Research and reviews', test: (p) => /^docs\/(research|reviews)\//.test(p) },
  { title: 'Board', test: (p) => /^docs\/board\//.test(p), folder: (p) => p.split('/').slice(2, -1).join('/') },
  {
    title: 'Agents and skills',
    test: (p) => /^\.claude\//.test(p),
    label: (p) => /^\.claude\/skills\/(.+)\/SKILL\.md$/.exec(p)?.[1] ?? null,
  },
  { title: 'Directory context', test: (p) => /\/CLAUDE\.md$/.test(p), label: (p) => p.replace(/\/CLAUDE\.md$/, '/') },
  { title: 'Archive', test: (p) => /^docs\/archive\//.test(p) },
  { title: 'Other', test: () => true },
];

const natural = (a, b) => a.localeCompare(b, 'en', { numeric: true });

/** `[{ title, items: [{ path, label, folder }] }]`, empty groups left out. */
export function groups(paths) {
  const buckets = GROUPS.map((group) => ({ ...group, items: [] }));
  for (const path of paths) {
    const group = buckets.find((g) => g.test(path));
    const name = path.split('/').pop().replace(/\.md$/, '');
    group.items.push({ path, label: group.label?.(path) ?? name, folder: group.folder?.(path) ?? '' });
  }
  return buckets
    .filter((group) => group.items.length)
    .map((group) => ({
      title: group.title,
      items: group.items.sort((a, b) =>
        group.order ? group.order(a.path) - group.order(b.path) : natural(a.folder, b.folder) || natural(a.path, b.path),
      ),
    }));
}

/** Lookups for references: story, sprint and input ids, ADR numbers, exact paths. */
export function buildIndex(paths) {
  const index = { paths: new Set(paths), ids: new Map(), adrs: new Map() };
  for (const path of paths) {
    // S-012.3 in S-012's folder under sprints/, open or in done/ - and T-012.3 with ST-012's
    // story.md, whose folder stood in docs/board/ itself before ADR-0011.
    const story = /^docs\/board\/(?:sprints\/)?(?:done\/)?[^/]+\/((?:S|T)-\d+\.\d+)[^/]*\.md$/.exec(path);
    const sprint = /^docs\/board\/(?:sprints\/)?(?:done\/)?((?:S|ST)-\d+)[^/]*\/(?:sprint|story)\.md$/.exec(path);
    const adr = /^docs\/(?:adr|decisions)\/(?:ADR-)?(\d{3,4})-[^/]*\.md$/.exec(path);
    // What waits on the owner: I-007, open in inputs/ or applied in inputs/done/.
    const input = /^docs\/board\/inputs\/(?:done\/)?(I-\d+)[^/]*\.md$/.exec(path);
    if (story) index.ids.set(story[1], path);
    if (sprint) index.ids.set(sprint[1], path);
    if (input) index.ids.set(input[1], path);
    if (adr) index.adrs.set(Number(adr[1]), path);
  }
  return index;
}

export const fileRoute = (path, anchor = '') =>
  `#/file/${path.split('/').map(encodeURIComponent).join('/')}${anchor ? `@${encodeURIComponent(anchor)}` : ''}`;

function normalize(path) {
  const out = [];
  for (const part of path.replace(/\\/g, '/').split('/')) {
    if (part === '..') out.pop();
    else if (part && part !== '.') out.push(part);
  }
  return out.join('/');
}

/** The `ctx.resolve` the renderer calls: a route for a reference this project can open, else null. */
export function resolver(index, current = '') {
  const here = current.split('/').slice(0, -1).join('/');
  const open = (path) => (index.paths.has(path) ? fileRoute(path) : null);
  const byId = (id) => (index.ids.has(id) ? fileRoute(index.ids.get(id)) : null);
  const byAdr = (digits) => (index.adrs.has(Number(digits)) ? fileRoute(index.adrs.get(Number(digits))) : null);

  return (kind, value) => {
    if (kind === 'id') return byId(value);
    if (kind === 'adr') return byAdr(value);
    if (kind === 'directive') {
      return index.paths.has('docs/PRIME_DIRECTIVES.md') ? fileRoute('docs/PRIME_DIRECTIVES.md', `n-${value}`) : null;
    }
    if (kind === 'code') {
      if (/^(?:(?:S|T)-\d+\.\d+|(?:S|ST|I)-\d+)$/.test(value)) return byId(value);
      const adr = /^ADR[- ]?(\d{3,4})$/.exec(value);
      if (adr) return byAdr(adr[1]);
      if (/\s/.test(value) || !value.includes('.')) return null;
      const path = normalize(value.replace(/:\d+$/, ''));
      return open(path) ?? open(normalize(`${here}/${path}`));
    }
    if (kind === 'link') {
      const [target, anchor = ''] = value.split('#');
      if (!target) return current ? fileRoute(current, anchor) : null;
      const path = normalize(target.startsWith('/') ? target : `${here}/${target}`);
      const found = [path, `${path}.md`, `${path}/README.md`].find((candidate) => index.paths.has(candidate));
      return found ? fileRoute(found, anchor) : null;
    }
    return null;
  };
}

/** What is worth a second look in a file: `{ kind: 'slot', text }`. No context file has a line budget. */
export function hints(file) {
  const out = [];
  if (file.slots > 0) {
    out.push({ kind: 'slot', text: file.slots === 1 ? '1 placeholder not filled in' : `${file.slots} placeholders not filled in` });
  }
  return out;
}
