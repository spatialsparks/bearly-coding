// Serves the inspector: a read-only browser view of this project's board and context files.
//
// Answers GET requests from this machine only: it listens on 127.0.0.1 and on no network
// interface, and answers no name but 127.0.0.1 and localhost. It hands the page two things: the
// inspector's own files, and - under /api - the project's context files and its git state. A
// file is served only if git can see it and it matches the allowlist below, so an ignored file
// such as .env cannot be reached through it. Nothing is ever written.
//
// The project is the main checkout, whichever worktree this script is started from: that is
// where the orchestrator keeps the board while a sprint runs.
//
//   node tools/inspector/serve.mjs                 start, and open the default browser
//   node tools/inspector/serve.mjs --no-browser    for the Claude desktop pane, .claude/launch.json
//   node tools/inspector/serve.mjs --print-port    print the port this project uses, and stop
//   node tools/inspector/serve.mjs --port 4800     another port, this once
//   node tools/inspector/serve.mjs --project ../other-project    look at another project with this copy
//
// Needs Node 20 or newer, and git. No dependency.

import { spawn } from 'node:child_process';
import { existsSync, lstatSync, readFileSync, realpathSync, statSync } from 'node:fs';
import http from 'node:http';
import { basename, dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { gitPath, gitState, publicRemote, runGit } from './git-state.mjs';

const USAGE = 'Usage: node tools/inspector/serve.mjs [--port N] [--no-browser] [--print-port] [--project DIR]';
const WINDOWS = process.platform === 'win32';

// What the page may read: the context files, wherever git lists them. Paths use forward
// slashes. Capitals make no difference, as they make none on a Windows or macOS disk: there
// Node_Modules is node_modules.
const ALLOW = [
  /^(CLAUDE|README|KICKOFF)\.md$/i,
  /^(.+\/)?CLAUDE\.md$/i,
  /^docs\/.+\.md$/i,
  /^\.claude\/(agents|skills|commands)\/.+\.md$/i,
  /^\.claude\/README\.md$/i,
  /^\.claude\/(settings|launch)\.json$/i,
  /^\.github\/.+\.md$/i,
];
const DENY = [/^tools\/inspector\//i, /^\.claude\/worktrees\//i, /(^|\/)node_modules\//i, /(^|\/)\.git\//i];

// A placeholder nobody filled in: the template's upper-case names in double braces, and the
// bracketed italic slots of its documents. Templates and the archive are allowed to hold them.
const PLACEHOLDER = /\{\{([A-Z][A-Z0-9_-]*|path)\}\}/g;
const SLOT = /_\[[^\]]{1,600}\]_/g;
const CODE_SPAN = /`[^`\n]*`/g;
const MAY_HOLD_SLOTS = /(^|\/)_TEMPLATE|_DIRECTORY_CLAUDE_TEMPLATE|pull_request_template|^docs\/archive\//i;

// The page's files, by their ending. The server's own two modules are no part of the page.
const TYPES = { html: 'text/html', css: 'text/css', mjs: 'text/javascript' };
const SERVER_SIDE = new Set(['serve.mjs', 'git-state.mjs']);
// The page may load its own scripts and styles and talk to this server. Nothing else.
const PAGE_POLICY = "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src data:; base-uri 'none'; form-action 'none'";

// --- which project, which port -------------------------------------------------------------

// A sentence, not a stack trace.
function stop(message) {
  console.error(message);
  process.exit(1);
}

// A file's text, read as its byte order mark says - Windows tools still write UTF-16 - and as
// UTF-8 where it has none.
function textOf(file) {
  const bytes = readFileSync(file);
  const [first, second] = bytes;
  const text =
    first === 0xff && second === 0xfe ? bytes.toString('utf16le')
    : first === 0xfe && second === 0xff ? Buffer.from(bytes.subarray(0, bytes.length & ~1)).swap16().toString('utf16le')
    : bytes.toString('utf8');
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function options(args) {
  const found = { port: 0, browser: true, printPort: false, project: '' };
  const rest = [...args];
  while (rest.length > 0) {
    const [name, attached] = rest.shift().split(/=(.*)/s); // --port=4800 as well as --port 4800
    const value = () => attached ?? rest.shift() ?? stop(`${name} needs a value.\n${USAGE}`);
    if (name === '--no-browser') found.browser = false;
    else if (name === '--print-port') found.printPort = true;
    else if (name === '--port') found.port = Number(value());
    else if (name === '--project') found.project = value();
    else stop(`Unknown option ${name}.\n${USAGE}`);
  }
  if (!Number.isInteger(found.port) || found.port > 65535) stop(`--port takes a number up to 65535.\n${USAGE}`);
  return found;
}

const flags = options(process.argv.slice(2));
const inspector = dirname(fileURLToPath(import.meta.url));
const here = flags.project ? resolve(flags.project) : resolve(inspector, '..', '..');
if (!existsSync(here)) stop(`${here} does not exist.`);

// One folder can be spelled in more than one way: through a link on the way to it, by a short
// name on Windows, in other capitals where those do not count. Git spells it its own way.
const place = (path) => {
  try {
    return realpathSync.native(path);
  } catch {
    return resolve(path);
  }
};
const samePath = (a, b) => (WINDOWS ? a.toLowerCase() === b.toLowerCase() : a === b);

const checkouts = (runGit(here, ['worktree', 'list', '--porcelain']) ?? '')
  .split('\n')
  .filter((line) => line.startsWith('worktree '))
  .map((line) => resolve(line.slice('worktree '.length).trim()));
// The folder has to be the top of a checkout itself. One that merely sits inside some other
// repository - a new project in a home-directory repository, say - would show that one's files.
const isProject = checkouts.some((checkout) => samePath(place(checkout), place(here)));
const root = isProject ? checkouts[0] : here;
const name = basename(root);

// The port in .claude/launch.json if it names one, so the desktop pane and a terminal agree;
// otherwise a number derived from the project's name, stable from run to run. Whatever sets a
// project up writes that same number into launch.json, so the sum must stay as it is.
function defaultPort() {
  try {
    const launch = JSON.parse(textOf(join(root, '.claude', 'launch.json')));
    const named = [].concat(launch.configurations ?? []).find((config) => String(config?.name).toLowerCase() === 'inspector');
    const port = /^\s*[+-]?\d+\s*$/.test(String(named?.port)) ? Number(named.port) : 0;
    if (port > 0 && port < 2 ** 31) return port;
  } catch {
    // no launch.json, or one whose port nobody filled in yet: the name decides
  }
  let hash = 0;
  const lower = name.toLowerCase();
  for (let i = 0; i < lower.length; i += 1) hash = (hash * 31 + lower.charCodeAt(i)) % 200;
  return 4700 + hash;
}

const port = flags.port > 0 ? flags.port : defaultPort();
if (flags.printPort) {
  console.log(port);
  process.exit(0);
}
if (port > 65535) stop(`${port} is no port. Start with --port <number>, or change the port in .claude/launch.json.`);
if (!gitPath) stop('The inspector reads a project through git, and git is not on the PATH.');
if (!isProject) {
  stop(`The inspector reads a project through git, and ${root} is not the top of a git repository yet. Phase 0 (/kickoff) makes it one.`);
}

const remote = publicRemote(runGit(root, ['remote', 'get-url', 'origin']));

// --- what the page may read ----------------------------------------------------------------

let allowed = new Set(); // the paths of the last listing, each exactly as git wrote it
const measured = new Map(); // path -> { stamp, lines, slots }, kept while the file stays as it is
const inside = root.endsWith(sep) ? root : root + sep;

const isAllowed = (path) => !DENY.some((pattern) => pattern.test(path)) && ALLOW.some((pattern) => pattern.test(path));

function measure(path, full) {
  const text = textOf(full);
  let lines = text.split('\n').length;
  if (text === '' || text.endsWith('\n')) lines -= 1;
  let slots = 0;
  if (!MAY_HOLD_SLOTS.test(path)) {
    slots = (text.match(PLACEHOLDER) ?? []).length;
    // A slot shown as an example sits in a code span; one waiting to be filled does not.
    slots += (text.replace(CODE_SPAN, '').match(SLOT) ?? []).length;
  }
  return { lines, slots };
}

function projectFiles() {
  const listed = runGit(root, ['-c', 'core.quotepath=off', 'ls-files', '-z', '--cached', '--others', '--exclude-standard',
    '--', '*.md', '.claude/settings.json', '.claude/launch.json']);
  const files = [];
  allowed = new Set();

  // True when no folder from the project's root down to this one is a link: on Windows git
  // lists files through a junction, and it could lead anywhere on the disk.
  const plain = new Map();
  const isPlain = (folder) => {
    if (folder.length <= root.length) return true;
    if (!plain.has(folder)) plain.set(folder, !lstatSync(folder).isSymbolicLink() && isPlain(dirname(folder)));
    return plain.get(folder);
  };

  for (const path of (listed ?? '').split('\0')) {
    if (!path || allowed.has(path) || !isAllowed(path)) continue;
    const full = resolve(root, path);
    if (!full.startsWith(inside)) continue;
    // A link could point anywhere on the disk; only real files in real folders are read.
    const info = lstatSync(full, { throwIfNoEntry: false });
    if (!info?.isFile() || !isPlain(dirname(full))) continue;
    const stamp = `${info.mtimeMs}:${info.size}`;
    let entry = measured.get(path);
    if (entry?.stamp !== stamp) {
      entry = { stamp, ...measure(path, full) };
      measured.set(path, entry);
    }
    allowed.add(path);
    files.push({ path, bytes: info.size, mtime: Math.floor(info.mtimeMs), lines: entry.lines, slots: entry.slots });
  }
  return files;
}

// --- answering -----------------------------------------------------------------------------

function send(response, status, type, body) {
  const headers = {
    'Content-Type': type,
    'Content-Length': body.length,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
  };
  if (type.startsWith('text/html')) headers['Content-Security-Policy'] = PAGE_POLICY;
  response.writeHead(status, headers).end(body);
}

const sendText = (response, status, text) => send(response, status, 'text/plain; charset=utf-8', Buffer.from(text));

// A path as the page escaped it. One that is no valid escape is taken as it was written.
const unescaped = (text) => {
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
};

function answer(request, response) {
  // A listener bound to an address is handed every request that reaches it, whatever name the
  // request asked for, so the name is checked here: a web page that points its own domain at
  // 127.0.0.1 gets nothing.
  const asked = String(request.headers.host ?? '').toLowerCase();
  if (asked !== `127.0.0.1:${port}` && asked !== `localhost:${port}`) {
    sendText(response, 403, 'The inspector answers only as 127.0.0.1 or localhost.');
    return;
  }
  if (request.method !== 'GET') {
    sendText(response, 405, 'The inspector only reads.');
    return;
  }
  // The address as it was sent, capitals aside: nothing in it is resolved or unescaped, so
  // one with dots or escapes in it names nothing here.
  const mark = request.url.indexOf('?');
  const query = mark < 0 ? '' : request.url.slice(mark);
  let path = (mark < 0 ? request.url : request.url.slice(0, mark)).toLowerCase();

  if (path === '/api/state') {
    const state = { project: { name, root, remote }, files: projectFiles(), git: gitState(root) };
    send(response, 200, 'application/json; charset=utf-8', Buffer.from(JSON.stringify(state)));
    return;
  }

  if (path === '/api/file') {
    const wanted = unescaped(/(?:^\?|&)path=([^&]*)/i.exec(query)?.[1] ?? '');
    // Only an exact entry of the list git gave is ever opened: no path is built from input.
    if (!allowed.has(wanted)) projectFiles();
    if (!allowed.has(wanted)) {
      sendText(response, 404, 'Not a file the inspector serves.');
      return;
    }
    send(response, 200, 'text/plain; charset=utf-8', readFileSync(join(root, wanted)));
    return;
  }

  // The inspector's own files: a flat folder, names of letters and hyphens only.
  if (path === '/') path = '/index.html';
  const own = /^\/([a-z-]+\.(html|css|mjs))$/.exec(path);
  if (own && !SERVER_SIDE.has(own[1])) {
    const file = join(inspector, own[1]);
    if (statSync(file, { throwIfNoEntry: false })?.isFile()) {
      send(response, 200, `${TYPES[own[2]]}; charset=utf-8`, readFileSync(file));
      return;
    }
  }
  sendText(response, 404, 'Not found.');
}

// --- start ---------------------------------------------------------------------------------

const address = `http://127.0.0.1:${port}/`;

// Requests are answered one at a time, each from start to end: git is asked and files are read
// without ever handing the turn to another request.
const server = http.createServer((request, response) => {
  try {
    answer(request, response);
  } catch (error) {
    console.warn(`${request.url.split('?')[0]}: ${error.message}`);
    try {
      sendText(response, 500, 'The inspector could not answer that.');
    } catch {
      response.destroy(); // part of an answer had already left
    }
  }
});

// What opens an address in the default browser, as a program and its arguments. On Windows by
// its full path, for the reason git is: a bare name is looked for in the current folder first.
// Elsewhere a bare name is looked for on PATH alone.
function browserCommand(url) {
  if (!WINDOWS) return [process.platform === 'darwin' ? 'open' : 'xdg-open', url];
  const system = join(process.env.SystemRoot, 'System32');
  return [join(system, 'rundll32.exe'), `${join(system, 'url.dll')},FileProtocolHandler`, url];
}

// The program is started by itself, never through a shell, with the address as one argument of
// its own. Where there is no browser, or no desktop at all, nothing happens: the address is on
// the screen.
function openBrowser(url) {
  try {
    const [program, ...args] = browserCommand(url);
    // Detached, so that Ctrl+C here does not take a browser it has just started down with it.
    const child = spawn(program, args, { detached: true, stdio: 'ignore', windowsHide: true });
    child.on('error', () => {});
    child.unref();
  } catch {
    // nothing to open it with
  }
}

// What the inspector that already holds the port says of itself, or null when nothing there
// answers as one within three seconds.
function holder() {
  return new Promise((done) => {
    const request = http.get(`${address}api/state`, { agent: false, signal: AbortSignal.timeout(3000) }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('close', () => done(null));
      response.on('error', () => done(null));
      response.on('end', () => {
        try {
          done(response.statusCode === 200 ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : null);
        } catch {
          done(null);
        }
      });
    });
    request.on('error', () => done(null));
  });
}

// Taken. If it is this project's own inspector, that is fine: show it and stop.
async function taken() {
  const there = (await holder())?.project;
  if (typeof there?.root === 'string' && samePath(there.root, root)) {
    console.log(`The inspector for ${name} is already running at ${address}`);
    if (flags.browser) openBrowser(address);
    return;
  }
  const who = there?.name ? `the inspector of ${there.name}` : 'another program';
  stop(`Port ${port} is in use by ${who}. Start with --port <number>, or change the port in .claude/launch.json.`);
}

// The address, and only the address. The name localhost can mean ::1 as well, and a hosts file
// can make it mean any interface; a request for http://localhost reaches 127.0.0.1 anyway.
server.once('error', taken);
server.listen(port, '127.0.0.1', () => {
  server.off('error', taken);
  console.log(`Inspector for ${name} at ${address}  (read-only, this machine only; Ctrl+C stops it)`);
  if (flags.browser) openBrowser(address);
});
