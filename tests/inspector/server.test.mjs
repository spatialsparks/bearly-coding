// The inspector's server, started for real against a throwaway project: what it serves and,
// above all, what it refuses. Needs git on the PATH, as the server itself does.
//
//   node --test tests/inspector/server.test.mjs
//
// Requests go out through node:http, which sends a path and a Host header exactly as they are
// given. fetch would tidy the one and refuses to set the other.

import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { chmodSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import { networkInterfaces, tmpdir } from 'node:os';
import { delimiter, dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { findGit, gitPath, publicRemote } from '../../scaffold/tools/inspector/git-state.mjs';

const serve = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'scaffold', 'tools', 'inspector', 'serve.mjs');
const windows = process.platform === 'win32';

// A plain Windows shell runs a program lying in the current folder before the one on PATH.
// Claude Code's own shells switch that off with this variable; the server is tested as a plain
// shell would start it.
delete process.env.NoDefaultCurrentDirectoryInExePath;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const slashed = (path) => path.replace(/\\/g, '/');

function write(path, text) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
}

// A port nobody listens on, asked of the system, so that a run never meets another one's server.
function freePort() {
  return new Promise((resolve, reject) => {
    const probe = http.createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

// --- the remote's shape, with no server at all -------------------------------------------------

test('a remote is reduced to where pull requests live, and no credential survives', () => {
  const remotes = [
    ['https://github.com/owner/repo.git', 'https://github.com/owner/repo'],
    ['https://github.com/owner/repo', 'https://github.com/owner/repo'],
    ['git@github.com:owner/repo.git', 'https://github.com/owner/repo'],
    ['ssh://git@github.com/owner/repo.git', 'https://github.com/owner/repo'],
    // A made-up password in a URL is put together from two strings, so that no secret scan
    // takes it for a real one.
    ['https://someone:s3' + 'cret@github.com/owner/repo.git', 'https://github.com/owner/repo'],
    ['https://s3cret@github.com/owner/repo.git', 'https://github.com/owner/repo'],
    ['https://user@example.com:s3' + 'cret@git.example.com/repo.git', ''],
    ['https://user@example.com:s3' + 'cret@git.example.com/o/repo.git', 'https://git.example.com/o/repo'],
    ['https://github.com/owner/repo.git?token=s3cret', ''],
    ['https://github.com/owner/repo.git#s3cret', ''],
    ['../somewhere', ''],
    ['', ''],
    [null, ''], // no origin at all: git has nothing to say
  ];
  for (const [url, expected] of remotes) {
    const shaped = publicRemote(url);
    assert.equal(shaped, expected, `remote '${url}'`);
    assert.ok(!shaped.includes('s3cret'), `no credential survives in '${url}'`);
  }
});

// --- finding git, and the port, with no server either -----------------------------------------

test('git is found in the folders PATH names in full, never in the current one', () => {
  const root = mkdtempSync(join(tmpdir(), 'inspector-path-'));
  const was = process.cwd();
  const find = (...folders) => findGit({ PATH: folders.join(delimiter), PATHEXT: '.COM;.EXE;.BAT;.CMD' });
  try {
    const program = join(root, windows ? 'git.exe' : 'git');
    writeFileSync(program, '');
    chmodSync(program, 0o755);
    assert.equal(find(join(root, 'nowhere'), root), program, 'by its full path, from the first folder that has one');
    // Standing in the folder that holds it, with a PATH that says "here" in both of its ways.
    process.chdir(root);
    assert.equal(find('.', ''), null, 'the current folder is not searched, whatever PATH says');
    if (windows) {
      writeFileSync(join(root, 'git.cmd'), '');
      assert.equal(findGit({ PATH: root, PATHEXT: '.CMD;.EXE' }), program, 'a git.cmd would need a shell, and is passed over');
    } else {
      chmodSync(program, 0o644);
      assert.equal(find(root), null, 'a file that cannot be run is not git');
    }
  } finally {
    process.chdir(was);
    rmSync(root, { recursive: true, force: true });
  }
});

test("the port is the one launch.json names for the inspector, else a number from the folder's name", () => {
  const root = mkdtempSync(join(tmpdir(), 'inspector-port-'));
  const printed = (name, ...more) => spawnSync(process.execPath, [serve, '--print-port', '--project', join(root, name), ...more], { encoding: 'utf8' }).stdout.trim();
  try {
    // 4700 plus a hash of the lower-cased name. These are the numbers that sum has always
    // given, and the script that sets a project up writes them: a project keeps its port.
    for (const [name, port] of [['project', '4709'], ['my-thing', '4713'], ['Bearly-Coding', '4802']]) {
      mkdirSync(join(root, name));
      assert.equal(printed(name), port, name);
    }
    const launch = join(root, 'project', '.claude', 'launch.json');
    write(launch, '{ "configurations": [{ "name": "inspector", "port": {{INSPECTOR_PORT}} }] }\n');
    assert.equal(printed('project'), '4709', 'a launch.json whose port nobody filled in yet');
    write(launch, JSON.stringify({ configurations: [{ name: 'dev', port: 3000 }, { name: 'inspector', port: 4811 }] }));
    assert.equal(printed('project'), '4811', 'the port launch.json names');
    assert.equal(printed('project', '--port', '4699'), '4699', 'and one given on the command line goes before both');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// --- the server ----------------------------------------------------------------------------------

test('the server, against a throwaway project', async (t) => {
  assert.ok(gitPath, 'git is on the PATH');
  // Each check is a test of its own, so that one that fails does not hide the next.
  const check = (name, actual, expected) => t.test(name, () => assert.deepEqual(actual, expected));

  const scratch = mkdtempSync(join(tmpdir(), 'inspector-test-'));
  const project = join(scratch, 'project');
  const outside = join(scratch, 'outside');
  const link = join(project, 'docs', 'linked');
  const git = (...args) => {
    const done = spawnSync(gitPath, ['-C', project, ...args], { encoding: 'utf8' });
    assert.equal(done.status, 0, `git ${args.join(' ')}: ${done.stderr}`);
  };

  let server = null;
  let gone = null;
  const kill = () => server?.kill();
  process.on('exit', kill); // should this file be stopped before it reaches its finally
  try {
    // --- a project with everything the server must and must not hand out -----------------------
    const files = {
      '.gitignore': '.env\nignored/\ngit.exe\nran-*.txt\n',
      '.env': 'API_KEY=must-never-be-served\n',
      'ignored/CLAUDE.md': '# ignored by git\n',
      'CLAUDE.md': '# root\n\nUses {{VERIFY_FAST}} and {{PROJECT_NAME}}.\n',
      'notes.md': '# not a context file\n',
      'src/core/CLAUDE.md': '# core\n',
      'src/core/index.ts': 'export {}\n',
      'docs/PROGRESS.md': '# Progress\n\n_[a slot nobody\nfilled in]_ and `_[an example]_`\n',
      'docs/board/BOARD.md': '# Board\n',
      'docs/board/_TEMPLATE-task.md': '# T-NNN.N\n\n_[a slot a template may hold]_ {{VERIFY_FAST}}\n',
      'docs/board/ST-001-x/T-001.1-first.md': '# T-001.1\n',
      'docs/board/sprints/S-002-y/S-002.1-first.md': '# S-002.1\n',
      'docs/board/log/wave-0001.md': '# Wave 1\n',
      '.claude/settings.json': '{}\n',
      '.claude/settings.local.json': '{}\n',
      '.claude/skills/sprint/SKILL.md': '# sprint\n',
      '.claude/worktrees/agent-1/CLAUDE.md': '# another checkout\n',
      'tools/inspector/README.md': "# the inspector's own files are not context\n",
      'node_modules/pkg/CLAUDE.md': '# a dependency\n',
    };
    for (const [name, text] of Object.entries(files)) write(join(project, name), text);
    // As a Windows tool may write it: UTF-16, behind a byte order mark.
    write(join(project, 'docs', 'wide.md'), Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from('# Wide\r\n{{VERIFY_FAST}}\r\n', 'utf16le')]));
    write(join(project, 'docs', 'untracked.md'), '# written, not committed yet\n');
    write(join(outside, 'elsewhere.md'), '# outside the project: must-never-be-served\n');

    const as = ['-c', 'user.name=test', '-c', 'user.email=test@test.invalid', '-c', 'commit.gpgsign=false'];
    git('init', '-q', '-b', 'main');
    git('config', 'core.autocrlf', 'false');
    git('add', '-A', '--', '.', ':!docs/untracked.md');
    git(...as, 'commit', '-q', '-m', 'fixture');
    git('branch', 'task/T-001.1-first');
    git('branch', 'sprint/01');
    // Today's shape (ADR-0011): a sprint branch with one commit per story - the second one
    // reverted - a story branch cut from it with a commit of its own, and a plan branch.
    git('switch', '-q', '-c', 'sprint/S-002');
    for (const story of [1, 2]) {
      write(join(project, 'src', 'core', `story${story}.ts`), 'export {}\n');
      git('add', '-A', '--', 'src');
      git(...as, 'commit', '-q', '-m', `feat: story number ${story} (S-002.${story})`);
    }
    git(...as, 'revert', '--no-edit', 'HEAD');
    git('switch', '-q', '-c', 'story/S-002.3-third');
    write(join(project, 'src', 'core', 'story3.ts'), 'export {}\n');
    git('add', '-A', '--', 'src');
    git(...as, 'commit', '-q', '-m', 'half of the third story');
    git('switch', '-q', 'main');
    git('branch', 'plan/S-003-next');
    git('remote', 'add', 'origin', 'https://someone:s3' + 'cret-in-the-remote@github.com/owner/repo.git');
    // ahead-behind needs git 2.41; an older git still lists the branches, without the counts.
    const counted = spawnSync(gitPath, ['-C', project, 'for-each-ref', '--format=%(ahead-behind:main)', 'refs/heads/main']).status === 0;

    // A link inside docs/ that leads out of the project: a junction on Windows, where git lists
    // files through it, and a symbolic link elsewhere.
    symlinkSync(outside, link, 'junction');
    // And a file that is itself such a link. Windows lets only some users make one.
    const fileLink = (() => {
      try {
        symlinkSync(join(outside, 'elsewhere.md'), join(project, 'docs', 'link.md'), 'file');
        return true;
      } catch {
        return false;
      }
    })();

    // A program the repository's own configuration names. Git runs it when asked to list files.
    const marker = join(project, 'ran-fsmonitor.txt');
    const monitor = join(scratch, 'fsmonitor.sh');
    writeFileSync(monitor, `#!/bin/sh\necho ran >> '${slashed(marker)}'\n`);
    chmodSync(monitor, 0o755);
    git('config', 'core.fsmonitor', `"${slashed(monitor)}"`);
    spawnSync(gitPath, ['-C', project, 'ls-files', '--others', '--exclude-standard']);
    const fsmonitorWouldRun = existsSync(marker);
    rmSync(marker, { force: true });

    // A git in the folder the server is started from. Started by its bare name, that one would
    // run on Windows - and anywhere else that PATH names the current folder.
    const stray = join(project, windows ? 'git.exe' : 'git');
    if (windows) copyFileSync(join(process.env.SystemRoot, 'System32', 'whoami.exe'), stray);
    else writeFileSync(stray, '#!/bin/sh\nexit 1\n');
    chmodSync(stray, 0o755);
    const plantedWouldRun = !/git version/.test(spawnSync('git', ['--version'], { cwd: project, encoding: 'utf8' }).stdout ?? '');

    // --- what can be asked without starting anything -------------------------------------------
    const port = await freePort();
    const base = ['--port', String(port), '--project'];
    const run = (...args) => spawnSync(process.execPath, [serve, ...args], { encoding: 'utf8', timeout: 30_000 });
    await check('the port can be asked for without starting anything', run('--print-port', ...base, project).stdout.trim(), String(port));
    const inner = run('--no-browser', ...base, join(project, 'src'));
    await check('a folder inside a repository is not taken for a project', /not the top of a git repository/.test(inner.stderr), true);
    await check('and that is an error, not a start', inner.status, 1);
    await check('its port can still be asked for', run('--print-port', ...base, join(project, 'src')).stdout.trim(), String(port));

    // --- the server, started in the project's folder as /board starts it -----------------------
    server = spawn(process.execPath, [serve, '--no-browser', ...base, project], { cwd: project, stdio: ['ignore', 'pipe', 'pipe'] });
    gone = new Promise((resolve) => server.once('close', resolve));
    let said = '';
    for (const stream of [server.stdout, server.stderr]) stream.on('data', (chunk) => (said += chunk));

    function ask(target, { method = 'GET', headers = {}, body, address = '127.0.0.1', patience = 10_000 } = {}) {
      return new Promise((resolve, reject) => {
        const options = { host: address, port, path: target, method, headers, agent: false, signal: AbortSignal.timeout(patience) };
        const request = http.request(options, (response) => {
          const chunks = [];
          response.on('data', (chunk) => chunks.push(chunk));
          response.on('error', reject);
          response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, body: Buffer.concat(chunks).toString('utf8') }));
        });
        request.on('error', reject);
        request.end(body);
      });
    }
    const status = async (target, options) => (await ask(target, options)).status;

    // It says where it is once it listens. Knocking before that costs Windows two seconds.
    for (let waited = 0; !said && server.exitCode === null && waited < 10_000; waited += 50) await sleep(50);
    let up = false;
    for (let tries = 0; tries < 40 && !up && server.exitCode === null; tries += 1) {
      up = await status('/api/state').then((code) => code === 200, () => false);
      if (!up) await sleep(250);
    }
    await check(`the server starts, a stray git beside it or not (the hazard is real here: ${plantedWouldRun})`, up, true);
    assert.ok(up, `the server did not start: ${said}`);

    // Every other address this machine has, the loopback address next to 127.0.0.1 and the IPv6
    // one: a server that listened on more than 127.0.0.1 would answer on one of them.
    const local = (() => {
      try {
        return Object.values(networkInterfaces()).flat().map((entry) => entry.address);
      } catch {
        return [];
      }
    })();
    const others = [...new Set(['127.0.0.2', '::1', ...local])].filter((address) => address !== '127.0.0.1' && !address.startsWith('fe80:'));
    const answering = await Promise.all(others.map((address) => ask('/api/state', { address, patience: 1500 }).then(() => address, () => null)));
    await check('it listens on this machine only', answering.filter(Boolean), []);

    const raw = (await ask('/api/state')).body;
    const state = JSON.parse(raw);
    await check('it lists the context files, tracked or not, and nothing else', state.files.map((file) => file.path).sort(), [
      '.claude/settings.json',
      '.claude/skills/sprint/SKILL.md',
      'CLAUDE.md',
      'docs/PROGRESS.md',
      'docs/board/BOARD.md',
      'docs/board/ST-001-x/T-001.1-first.md',
      'docs/board/_TEMPLATE-task.md',
      'docs/board/log/wave-0001.md',
      'docs/board/sprints/S-002-y/S-002.1-first.md',
      'docs/untracked.md',
      'docs/wide.md',
      'src/core/CLAUDE.md',
    ]);
    await check('the project is named after its folder', state.project.name, 'project');
    await check('the remote is reduced to where pull requests live', state.project.remote, 'https://github.com/owner/repo');
    const by = Object.fromEntries(state.files.map((file) => [file.path, file]));
    await check('lines are counted', by['CLAUDE.md']?.lines, 3);
    await check('placeholders in double braces are counted', by['CLAUDE.md']?.slots, 2);
    await check('a bracketed slot counts, its example in a code span does not', by['docs/PROGRESS.md']?.slots, 1);
    await check('a template may hold slots', by['docs/board/_TEMPLATE-task.md']?.slots, 0);
    await check('a file written in UTF-16 is measured as what it says', [by['docs/wide.md']?.lines, by['docs/wide.md']?.slots], [2, 1]);
    const branch = (name) => state.git.branches.find((entry) => entry.name === name);
    await check('branches are reported', state.git.branches.map((entry) => entry.name), ['plan/S-003-next', 'sprint/01', 'sprint/S-002', 'story/S-002.3-third', 'task/T-001.1-first']);
    await check('the main checkout is marked', state.git.worktrees.filter((worktree) => worktree.main).length, 1);
    await check('a branch with no work is still listed as merged by git', state.git.merged['sprint/01'], ['task/T-001.1-first']);
    await check('a story is in once its sprint branch holds its commit, and out again once that is reverted', state.git.landed['sprint/S-002'], ['S-002.1']);
    await check('a numbered sprint branch of before holds no such commit', state.git.landed['sprint/01'], []);
    await check("a story branch is ahead by its own work, not by its sprint's", branch('story/S-002.3-third')?.ahead, 1);
    await check(`and the sprint branch by every commit it holds (this git counts them: ${counted})`, branch('sprint/S-002')?.ahead, counted ? 3 : null);

    const listed = await ask('/api/file?path=docs/board/ST-001-x/T-001.1-first.md');
    await check('a listed file is served, as plain text', [listed.status, listed.headers['content-type'], listed.body], [200, 'text/plain; charset=utf-8', '# T-001.1\n']);
    await check("and so are a story and a wave's log file", [await status('/api/file?path=docs/board/sprints/S-002-y/S-002.1-first.md'), await status('/api/file?path=docs/board/log/wave-0001.md')], [200, 200]);
    await check('the page is served', await status('/'), 200);
    await check('a module is served', await status('/app.mjs'), 200);

    // --- refusals ------------------------------------------------------------------------------
    const escaped = encodeURIComponent;
    const refused = {
      'an ignored secret': '/api/file?path=.env',
      'an ignored context file': '/api/file?path=ignored/CLAUDE.md',
      'a file that is not context': '/api/file?path=notes.md',
      'source code': '/api/file?path=src/core/index.ts',
      'local settings': '/api/file?path=.claude/settings.local.json',
      "another checkout's files": '/api/file?path=.claude/worktrees/agent-1/CLAUDE.md',
      "the inspector's own files by api": '/api/file?path=tools/inspector/README.md',
      'a dependency': '/api/file?path=node_modules/pkg/CLAUDE.md',
      'a file reached through a link': '/api/file?path=docs/linked/elsewhere.md',
      // The file outside is really there: a server that joined the path to the project's would serve it.
      'a climb out of the project': `/api/file?path=${escaped('../outside/elsewhere.md')}`,
      'a climb back down to the secret': '/api/file?path=docs%2F..%2F.env',
      'the same with backslashes': '/api/file?path=docs%5C..%5C.env',
      'an absolute path': `/api/file?path=${escaped(join(outside, 'elsewhere.md'))}`,
      'no path at all': '/api/file',
      'the server script as a page': '/serve.mjs',
      'the same in capitals': '/SERVE.MJS',
      'the module beside it that asks git': '/git-state.mjs',
      'git internals as a page': '/.git/config',
      'a climb in the address itself': '/../outside/elsewhere.md',
      'a climb from the page to the secret': '/x/../.env',
    };
    let everything = raw;
    for (const [name, target] of Object.entries(refused)) {
      const answer = await ask(target);
      everything += answer.body;
      await check(`refused: ${name}`, answer.status, 404);
    }
    await t.test('refused: a file that is itself a link', { skip: fileLink ? false : 'this user may not make a symbolic link' }, async () => {
      const answer = await ask('/api/file?path=docs/link.md');
      everything += answer.body;
      assert.equal(answer.status, 404);
    });
    await check('refused: a write', await status('/api/state', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'x=1' }), 405);
    await check('refused: a delete', await status('/api/file?path=CLAUDE.md', { method: 'DELETE' }), 405);
    await check('refused: a request under another host name', await status('/api/state', { headers: { Host: 'evil.test' } }), 403);
    await check('refused: the right address under the wrong port', await status('/api/state', { headers: { Host: '127.0.0.1:1' } }), 403);
    await check('a browser asking for localhost is answered too', await status('/api/state', { headers: { Host: `localhost:${port}` } }), 200);

    await check('no secret appears in any answer', /must-never-be-served|s3cret/.test(everything), false);
    await check(`listing files runs no program the repository names (it would have run here: ${fsmonitorWouldRun})`, existsSync(marker), false);
    const page = await ask('/', { headers: { Origin: 'https://evil.test' } });
    await check('no other site is allowed to read answers', /access-control/i.test(JSON.stringify(page.headers)), false);
    await check('the page may run only its own scripts', /script-src 'self'/.test(page.headers['content-security-policy'] ?? ''), true);

    const again = run('--no-browser', ...base, project);
    await check('a second start on the same project is recognized, not an error', [/already running/.test(again.stdout), again.status], [true, 0]);
  } finally {
    kill();
    await gone;
    process.off('exit', kill);
    // The link first, as a link: removing it must not empty the folder it points at.
    try {
      unlinkSync(link);
    } catch {
      // never made
    }
    rmSync(scratch, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});
