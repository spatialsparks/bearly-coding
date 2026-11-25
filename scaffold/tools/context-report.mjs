// Prints how large each agent's context grew since a given time, as lines for a wave's log file.
//
// Reads this project's Claude Code transcripts: every session, and every sub-agent a session
// spawned, written to since --since. For each it prints the description its Agent call gave
// it - which starts with the story id - or "session" and the session's id; the agent type; the
// peak context; the number of API requests; and the number of compactions (ADR-0008).
//
// Context is input_tokens + cache_creation_input_tokens + cache_read_input_tokens of one API
// request, and the peak is the largest. Nothing is written.
//
// Copied from bearly-coding, like tools/inspector/, and never edited here.
//
//   git log -1 --format=%cI --grep="^docs: plan wave 12$"
//   node tools/context-report.mjs --since 2026-10-03T09:12:44+02:00
//
//   node tools/context-report.mjs --since 2026-10-03 --project ../other-project --root ../elsewhere/projects

import { closeSync, openSync, readdirSync, readFileSync, readSync, realpathSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

const USAGE = 'node tools/context-report.mjs --since <time> [--project DIR] [--root DIR]';
const OPTIONS = {
  since: { type: 'string' }, // required: the wave's planning commit time, from git log as above
  project: { type: 'string' }, // the main checkout; the current directory if not given
  root: { type: 'string' }, // $CLAUDE_CONFIG_DIR/projects if that is set, else ~/.claude/projects
};

// Claude Code keeps a project's transcripts in a folder named after the project's path, with
// every character but a letter, a digit or a hyphen made a hyphen: C:\Work\x is C--Work-x, and
// /work/x is -work-x. One hyphen per UTF-16 unit, so the pattern must not get the u flag.
/** The name of the folder that holds the transcripts of the project at this absolute path. */
export const folderName = (project) => project.replace(/[^A-Za-z0-9-]/g, '-');

// An ISO 8601 date, or a date and a time: 2026-10-03, 2026-10-03T09:12, 2026-10-03T09:12:44.5 -
// then Z, an offset such as +02:00, or neither. A space may stand for the T and before the
// offset, which is how git log --format=%ci writes it. 2026-10 is the first day of that month.
const TIME = /^(\d{4})-(\d\d)(?:-(\d\d)(?:[T ](\d\d):(\d\d)(?::(\d\d)(?:\.(\d+))?)?)? ?(Z|([+-])(\d\d)(?::?(\d\d))?)?)?$/i;

/** The time a text names, as milliseconds since 1970, or null: local time where it names no offset. */
export function parseTime(text) {
  const found = TIME.exec(text.trim());
  if (!found) return null;
  const [, year, month, day = '01', hour = '00', minute = '00', second = '00', fraction = '0', zone, sign, hours, minutes = '00'] = found;
  const clock = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
  // Read as UTC and written back, it shows whether there is such a day and such an hour: Date
  // takes 30 February for 2 March.
  const utc = Date.parse(`${clock}Z`);
  if (Number.isNaN(utc) || new Date(utc).toISOString().slice(0, 19) !== clock) return null;
  // An offset is at most 14 hours, and its minutes at most 59.
  const ahead = sign ? Number(`${sign}1`) * (Number(hours) * 60 + Number(minutes)) : 0;
  if (Number(minutes) > 59 || Math.abs(ahead) > 14 * 60) return null;
  const whole = zone ? utc - ahead * 60_000 : Date.parse(clock);
  return whole + Number(`${fraction}e${3 - fraction.length}`);
}

function isFolder(path) {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

// The drive letter's case varies, so the name is matched without regard to case. A file system
// that tells App from app can hold a folder for each: there the one spelled as the path wins.
function findFolder(root, name) {
  if (!isFolder(root)) return null;
  const same = readdirSync(root).filter((entry) => entry.toLowerCase() === name.toLowerCase() && isFolder(join(root, entry)));
  const found = same.find((entry) => entry === name) ?? same[0];
  return found ? join(root, found) : null;
}

// The files in a folder whose names match, and the folders in it, both in the order of their
// names. Not every file system lists them so, and lines that sort alike come out in this order.
function list(folder, pattern) {
  const entries = readdirSync(folder, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : Number(a.name > b.name)));
  const paths = (kept) => kept.map((entry) => join(folder, entry.name));
  return {
    files: paths(entries.filter((entry) => entry.isFile() && pattern.test(entry.name))),
    folders: paths(entries.filter((entry) => entry.isDirectory())),
  };
}

function agentsIn(folder) {
  const { files, folders } = list(folder, /^agent-.*\.jsonl$/i);
  return [...files, ...folders.flatMap((inner) => agentsIn(inner))];
}

// A session is <id>.jsonl. Its sub-agents are <id>/subagents/agent-<x>.jsonl, each beside an
// agent-<x>.meta.json that holds its agentType and the description its Agent call gave it.
function transcriptsIn(folder) {
  const { files, folders } = list(folder, /\.jsonl$/i);
  const agents = folders.map((session) => join(session, 'subagents')).filter(isFolder);
  return [...files, ...agents.flatMap((inner) => agentsIn(inner))];
}

// A transcript is one JSON object per line, and a long one is tens of megabytes, so nothing is
// parsed whole: the lines that matter are picked out by their text. In a JSON string a quote is
// escaped, so these patterns match the transcript's own fields, never text quoted inside one.
const REQUEST = /"requestId":"([^"]+)"/;
const TOKENS = ['input_tokens', 'cache_creation_input_tokens', 'cache_read_input_tokens'].map((count) => new RegExp(`"${count}":(\\d+)`));
// Nothing else ends a line: a JSON string may hold U+2028 as it is, where node:readline would cut.
const LINE_END = /\r\n?|\n/;

function measure(path) {
  let peak = 0;
  let boundaries = 0;
  let summaries = 0;
  const requests = new Set();
  const count = (line) => {
    // A compaction writes a boundary line and a summary line: either one counts it once.
    if (line.includes('"subtype":"compact_boundary"')) boundaries += 1;
    if (line.includes('"isCompactSummary":true')) summaries += 1;
    if (!line.includes('"type":"assistant"')) return;
    // One request can be written as several lines with the same requestId. A line with none is
    // a message Claude Code made up itself, an error say, and no request at all.
    const id = REQUEST.exec(line);
    const usage = line.indexOf('"usage":{');
    if (!id || usage < 0) return;
    requests.add(id[1]);
    // The first of each count is the request's own; its "iterations" repeat them after.
    const own = line.slice(usage);
    const context = TOKENS.reduce((sum, tokens) => sum + Number(tokens.exec(own)?.[1] ?? 0), 0);
    if (context > peak) peak = context;
  };

  // Read a piece at a time: what follows a piece's last line end waits for the next piece. Only
  // the new piece is searched for line ends, or one long line would be searched over and over.
  // Node opens a file shared for writing and deleting, on Windows too: Claude Code may be
  // appending to it right now.
  const piece = Buffer.allocUnsafe(64 * 1024);
  const decoder = new TextDecoder();
  let rest = '';
  const file = openSync(path, 'r');
  try {
    for (let read = readSync(file, piece); read > 0; read = readSync(file, piece)) {
      const lines = decoder.decode(piece.subarray(0, read), { stream: true }).split(LINE_END);
      lines[0] = rest + lines[0];
      rest = lines.pop();
      lines.forEach(count);
    }
  } finally {
    closeSync(file);
  }
  count(rest + decoder.decode());
  return { peak, requests: requests.size, compactions: Math.max(boundaries, summaries) };
}

function metaOf(transcript) {
  try {
    return JSON.parse(readFileSync(transcript.replace(/\.jsonl$/i, '.meta.json'), 'utf8').replace(/^\uFEFF/, ''));
  } catch {
    return null; // none beside it, or a broken one: the agent goes by its file's name
  }
}

const plural = (number, noun) => (number === 1 ? `1 ${noun}` : `${number} ${noun}s`);

// The lines keep the order they had when PowerShell sorted them, so that a log reads the same
// whichever wrote it. That is the order Windows gives words: letters without regard to case, a
// hyphen, a dash or an apostrophe passed over - re-check sorts as recheck - and the other signs
// of a keyboard in the order of SIGNS. Intl has those in an order of its own, so each is swapped
// for the sign that Intl has in its place.
const SIGNS = ' !"#$%&()*,./:;?@[\\]^_`{|}~+<=>';
const PASSED_OVER = /['\-\u2010-\u2015\u2212]/g;
const inOrder = new Intl.Collator('en').compare;
const swapped = new Map([...SIGNS].sort(inOrder).map((sign, place) => [SIGNS[place], sign]));
const sortKey = (name) => name.replace(PASSED_OVER, '').replace(/[ -~]/g, (letter) => swapped.get(letter) ?? letter);

function row(transcript) {
  const { peak, requests, compactions } = measure(transcript);
  const id = basename(transcript).slice(0, -'.jsonl'.length);
  const session = !/^agent-/i.test(id);
  const meta = session ? null : metaOf(transcript);
  const fields = session
    ? [`session ${id.slice(0, 8)}`]
    : [meta?.description ? String(meta.description).replace(/\s+/g, ' ').trim() : id, meta?.agentType ? String(meta.agentType) : 'agent'];
  fields.push(`${Math.round(peak / 1000)}k`, plural(requests, 'request'), plural(compactions, 'compaction'));
  return {
    session,
    // Numbers padded, so S-001.2 sorts before S-001.10.
    order: sortKey(fields[0].replace(/\d+/g, (digits) => digits.padStart(10, '0'))),
    line: `  - ${fields.join(' · ')}`,
  };
}

// Said plainly, and in yellow where a terminal shows colours. The report then ends with 1.
function stop(message) {
  console.log(process.stdout.hasColors?.() ? `\x1b[33m${message}\x1b[39m` : message);
  process.exitCode = 1;
}

function main() {
  let given;
  try {
    given = parseArgs({ options: OPTIONS }).values;
  } catch (error) {
    console.error(`${error.message}\nUsage: ${USAGE}`);
    process.exitCode = 1;
    return;
  }
  const since = given.since ?? '';
  const from = parseTime(since);
  if (from === null) {
    stop(`--since needs a time, and "${since}" is none. The wave's planning commit has it: git log -1 --format=%cI --grep="^docs: plan wave NN$"`);
    return;
  }
  const project = resolve(given.project || '.');
  const root = resolve(given.root || join(process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude'), 'projects'));

  const name = folderName(project);
  const folder = findFolder(root, name);
  if (!folder) {
    stop(`No transcripts of ${project} in ${root}: there is no folder ${name} there.`);
    return;
  }
  const transcripts = transcriptsIn(folder).filter((path) => statSync(path, { throwIfNoEntry: false })?.mtimeMs >= from);
  if (transcripts.length === 0) {
    stop(`No transcript in ${folder} was written to since ${since}.`);
    return;
  }

  // Sessions first, then the agents, each in the order of their names.
  const rows = transcripts.map(row).sort((a, b) => b.session - a.session || inOrder(a.order, b.order));
  console.log(['- **Contexts** peak context per agent (ADR-0008):', ...rows.map((each) => each.line)].join('\n'));
}

// Run as a command it reports; imported, as its test does, it only offers its functions. Node
// names this module by the command's path, with the links in it followed unless it was told to
// preserve them: under either spelling this is the command.
function isCommand() {
  try {
    const named = process.argv[1];
    return [named, realpathSync(named)].some((path) => pathToFileURL(path).href === import.meta.url);
  } catch {
    return false; // no script was named, or what was named is no file: node -e, a pattern for node --test
  }
}

if (isCommand()) main();
