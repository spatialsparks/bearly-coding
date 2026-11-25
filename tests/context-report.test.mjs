// The context report, run for real against a small fixture of transcripts: each line it prints,
// and what it leaves out.
//
// The fixture's transcripts are those of a made-up project at C:\Work\My Project.v2, a path on
// Windows only. So the rule that names a folder after a path is checked by itself, on paths of
// either kind, and for the runs the fixture is copied to the folder of a temporary project on
// the machine the test runs on. Its sessions have short ids, unlike real ones: the plugin is
// checked out deep inside Claude Code's folder, and Windows refuses a path of more than 260
// characters.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readdirSync, realpathSync, rmSync, symlinkSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test, { after } from 'node:test';
import { fileURLToPath } from 'node:url';

import { folderName, parseTime } from '../scaffold/tools/context-report.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const script = join(here, '..', 'scaffold', 'tools', 'context-report.mjs');
const fixture = join(here, 'fixtures', 'transcripts');

// Resolved, so that it is spelled as a process started in it reads its own directory: on macOS
// the temporary folder is reached through a link.
const scratch = realpathSync.native(mkdtempSync(join(tmpdir(), 'context-report-')));
after(() => rmSync(scratch, { recursive: true, force: true }));

const home = join(scratch, 'home');
const config = join(home, '.claude');
const root = join(config, 'projects');
const project = join(scratch, 'My Project.v2');
const now = new Date();

// On disk the folder's name has the case of its first letter changed: on Windows that is the
// drive letter, whose case varies.
const otherCase = (name) => name.replace(/[a-z]/i, (letter) => (letter === letter.toLowerCase() ? letter.toUpperCase() : letter.toLowerCase()));
const folder = join(root, otherCase(folderName(project)));

// Transcripts are told apart by when they were last written, which git does not keep: set it.
function plant(from, to) {
  mkdirSync(to, { recursive: true });
  for (const entry of readdirSync(from, { withFileTypes: true })) {
    const [source, target] = [join(from, entry.name), join(to, entry.name)];
    if (entry.isDirectory()) {
      plant(source, target);
    } else {
      copyFileSync(source, target);
      // Session 99999999 and its agents are the old ones.
      const written = source.slice(fixture.length + 1).startsWith('99999999') ? new Date('2020-01-01T00:00:00Z') : now;
      utimesSync(target, written, written);
    }
  }
}
mkdirSync(project);
plant(fixture, folder);

// Read as UTF-8, which the report writes whatever the terminal's own encoding.
const report = (args, options = {}) => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', ...options });
const since = ['--since', '2024-01-01T00:00:00Z'];
const expected = [
  '- **Contexts** peak context per agent (ADR-0008):',
  '  - session 11111111 · 125k · 3 requests · 1 compaction',
  '  - agent-a4 · agent · 1k · 1 request · 0 compactions',
  '  - T-001.2 the second task · implementer · 306k · 2 requests · 0 compactions',
  '  - T-001.10 the tenth task · implementer · 50k · 1 request · 0 compactions',
  '  - Verify sprint 1 · verifier · 100k · 1 request · 0 compactions',
  '',
].join('\n');

// A request as a transcript holds it, cut down to what the report reads - and to what it must
// not read: a count before the usage, and the counts that the iterations repeat after it. Its
// first field and its last are both needed, so a line cut in two anywhere would count for nothing.
const request = (id, tokens, text = '') =>
  `{"type":"assistant","message":{"content":"${text}","input":{"input_tokens":7000000},"usage":{"input_tokens":${tokens},"iterations":[{"input_tokens":8000000}]}},"requestId":"req_${id}"}`;

// A project of one session that holds these lines, and all that the report prints for such a one.
function session(ofProject, lines) {
  const at = join(root, folderName(ofProject));
  mkdirSync(at, { recursive: true });
  writeFileSync(join(at, 'abcdef01-2222-4333-8444-555555555555.jsonl'), lines.join('\n'));
}
const sessionLine = (peak, requests) => `- **Contexts** peak context per agent (ADR-0008):\n  - session abcdef01 · ${peak} · ${requests} · 0 compactions\n`;

test('one line per transcript written to since then: its peak, its requests, its compactions', () => {
  const result = report([...since, '--project', project, '--root', root]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, expected);
  // A transcript last written before --since is left out.
  assert.doesNotMatch(result.stdout, /99999999|T-000\.1|778k|667k/);
});

test('without --root it reads CLAUDE_CONFIG_DIR/projects', () => {
  const result = report([...since, '--project', project], { env: { ...process.env, CLAUDE_CONFIG_DIR: config } });
  assert.equal(result.stdout, expected);
});

test('without that either it reads ~/.claude/projects, and without --project the directory it is run in', () => {
  const env = { ...process.env, CLAUDE_CONFIG_DIR: '', HOME: home, USERPROFILE: home };
  assert.equal(report(since, { cwd: project, env }).stdout, expected);
});

test('without --since it stops, and says where the time comes from', () => {
  const message = (given) => `--since needs a time, and "${given}" is none. The wave's planning commit has it: git log -1 --format=%cI --grep="^docs: plan wave NN$"\n`;
  const without = report(['--project', project, '--root', root]);
  assert.equal(without.status, 1);
  assert.match(without.stdout, /plan wave NN/);
  assert.equal(without.stdout, message(''));
  // What is no time stops it the same way.
  const noTime = report(['--since', 'yesterday', '--project', project, '--root', root]);
  assert.deepEqual([noTime.status, noTime.stdout], [1, message('yesterday')]);
});

test('a project with no transcripts stops, and names the folder it looked for', () => {
  const another = join(scratch, 'Another');
  const result = report(['--since', '2024-01-01', '--project', another, '--root', root]);
  assert.equal(result.status, 1);
  assert.equal(result.stdout, `No transcripts of ${another} in ${root}: there is no folder ${folderName(another)} there.\n`);
});

test('nothing written to since --since stops too', () => {
  const later = new Date(now.getTime() + 5 * 60_000).toISOString();
  const result = report(['--since', later, '--project', project, '--root', root]);
  assert.equal(result.status, 1);
  assert.equal(result.stdout, `No transcript in ${folder} was written to since ${later}.\n`);
});

test('a folder is named after its project as Claude Code names it, whatever the kind of path', () => {
  assert.equal(folderName('C:\\Work\\My Project.v2'), 'C--Work-My-Project-v2');
  // The drive letter's case varies, and the name keeps it.
  assert.equal(folderName('c:\\Work\\My Project.v2'), 'c--Work-My-Project-v2');
  assert.equal(folderName('C:\\'), 'C--');
  assert.equal(folderName('\\\\server\\share\\x_y'), '--server-share-x-y');
  assert.equal(folderName('/home/dev/My Project.v2'), '-home-dev-My-Project-v2');
  assert.equal(folderName('/'), '-');
  // One hyphen for each UTF-16 unit, and the second letter here is two of them.
  assert.equal(folderName('/srv/a-b/é😀'), '-srv-a-b----');
});

test('where a file system tells App from app, each project has its own folder', (t) => {
  const [upper, lower] = [join(scratch, 'twins', 'App'), join(scratch, 'twins', 'app')];
  session(upper, [request(1, 1000)]);
  session(lower, [request(1, 2000)]);
  const folders = readdirSync(root);
  if (![upper, lower].every((twin) => folders.includes(folderName(twin)))) return t.skip('this file system does not tell them apart');
  // Whichever of the two the root lists first, each run reads the one spelled as its path.
  assert.equal(report([...since, '--project', upper, '--root', root]).stdout, sessionLine('1k', '1 request'));
  assert.equal(report([...since, '--project', lower, '--root', root]).stdout, sessionLine('2k', '1 request'));
});

test('agents come in the order Windows gives their names, and one name twice in the order of its files', () => {
  // As PowerShell sorted them: a full stop before an underscore, case set aside, a hyphen or
  // an apostrophe passed over, and 2 before 10.
  const names = [
    'Port share.ts',
    'Port share_links.ts',
    're-check the adapter',
    'recheck the port',
    'Research tile hosts',
    'Re-verify wave 12',
    "Review S-004b's stories",
    "Review S-004's stories",
    'S-001.2 two',
    'S-001.10 ten',
    'Verify wave 12',
  ];
  const ordered = join(scratch, 'Ordered');
  const agents = join(root, folderName(ordered), 'abcdef01-2222-4333-8444-555555555555', 'subagents');
  mkdirSync(agents, { recursive: true });
  // A description comes with whatever space its Agent call gave it, and is printed with one at a time.
  const agent = (file, description, tokens, meta = JSON.stringify({ agentType: 'implementer', description: ` ${description.replaceAll(' ', '\n  ')}\t` })) => {
    writeFileSync(join(agents, `${file}.jsonl`), request(file, tokens));
    writeFileSync(join(agents, `${file}.meta.json`), meta);
  };
  // The last name first, so that the names are in the order neither of the files nor of their making.
  [...names].reverse().forEach((name, index) => agent(`agent-${index}`, name, 1000));
  // One name three times. PowerShell left their order to chance; now it is that of the files' names.
  agent('agent-z2', 'Verify wave 12', 3000);
  agent('agent-z1', 'Verify wave 12', 2000);
  // A meta file that broke off: the agent goes by its file's name, as one without a meta file does.
  agent('agent-cut', '', 1000, '{"agentType":"implementer","descr');
  // A session that spawned no agent has a folder too, for what its tools returned.
  mkdirSync(join(root, folderName(ordered), 'bcdef012-2222-4333-8444-555555555555', 'tool-results'), { recursive: true });

  const line = (name, peak) => `  - ${name} · implementer · ${peak} · 1 request · 0 compactions`;
  const lines = names.flatMap((name) => (name === 'Verify wave 12' ? ['1k', '2k', '3k'] : ['1k']).map((peak) => line(name, peak)));
  lines.unshift('  - agent-cut · agent · 1k · 1 request · 0 compactions');
  assert.deepEqual(report([...since, '--project', ordered, '--root', root]).stdout.split('\n').slice(1, -1), lines);
});

test('--since takes an ISO 8601 date, or date and time: local time where it names no offset', () => {
  const utc = Date.UTC(2026, 9, 3, 9, 12, 44);
  assert.equal(parseTime('2026-10-03T09:12:44Z'), utc);
  assert.equal(parseTime('2026-10-03T09:12:44+02:00'), utc - 2 * 3_600_000);
  assert.equal(parseTime('2026-10-03T09:12:44-0530'), utc + 5.5 * 3_600_000);
  assert.equal(parseTime('2026-10-03 09:12:44 +0200'), utc - 2 * 3_600_000); // git log --format=%ci
  assert.equal(parseTime('2026-10-03T09:12:44.5Z'), utc + 500);
  assert.equal(parseTime('2026-10-03T09:12:44.1234567Z'), utc + 123.4567);
  assert.equal(parseTime('2026-10-03T09:12:44'), new Date(2026, 9, 3, 9, 12, 44).getTime());
  assert.equal(parseTime(' 2026-10-03T09:12 '), new Date(2026, 9, 3, 9, 12).getTime());
  assert.equal(parseTime('2026-10-03'), new Date(2026, 9, 3).getTime());
  assert.equal(parseTime('2026-10'), new Date(2026, 9, 1).getTime());
  assert.equal(parseTime('2024-02-29'), new Date(2024, 1, 29).getTime());
  const none = ['', 'yesterday', '2026', '2026-02-29', '2026-13-01', '2026-10-03T09', '2026-10-03T24:00:00', '2026-10-03T09:12:44+15:00', '10/03/2026', '3 Oct 2026', '09:12'];
  for (const text of none) assert.equal(parseTime(text), null, text);
});

test('a transcript longer than one read, with a line longer than one read, is measured whole', () => {
  const long = join(scratch, 'Long');
  // A line that broke off after its count is passed over. U+2028 and U+2029 end a line for some
  // readers, but a JSON string may hold them as they are. No line end after the last line, which
  // holds the peak.
  session(long, [
    ...Array.from({ length: 3000 }, (_, index) => request(index, index, 'é'.repeat(index % 97))),
    request('long', 500_000, '€'.repeat(200_000)),
    request('cut', 3_000_000).split(',"iterations"')[0],
    request('separators', 1, `a${String.fromCharCode(0x2028, 0x2029)}b`),
    request('last', 2_000_000),
  ]);
  assert.equal(report([...since, '--project', long, '--root', root]).stdout, sessionLine('2000k', '3003 requests'));
});

test('reached through a link, it still reports', (t) => {
  // The link leads to a copy: whatever follows it when the scratch folder is removed finds no
  // file of the repository behind it.
  const [tools, link] = [join(scratch, 'tools'), join(scratch, 'link')];
  mkdirSync(tools);
  copyFileSync(script, join(tools, 'context-report.mjs'));
  try {
    // A junction, where Windows would want a right for a link; elsewhere the word is ignored.
    symlinkSync(tools, link, 'junction');
  } catch {
    return t.skip('no link can be made here');
  }
  const result = spawnSync(process.execPath, [join(link, 'context-report.mjs'), ...since, '--project', project, '--root', root], { encoding: 'utf8' });
  assert.equal(result.stdout, expected);
});
