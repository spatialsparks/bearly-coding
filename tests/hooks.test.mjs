// The git hooks, run for real against throwaway repositories: what they stop, and what they let
// through. They need TruffleHog on the PATH, as the hooks themselves do; without it these tests
// are skipped, and say so.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { appendFileSync, chmodSync, copyFileSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const hooks = join(dirname(fileURLToPath(import.meta.url)), '..', 'scaffold', '.githooks');
const skip = spawnSync('trufflehog', ['--version']).status === 0 ? false : 'trufflehog is not installed';

// A made-up password in a URL, put together from parts so that no scan takes this file for a
// leak. The host can never resolve, so TruffleHog reports it as one it could not check.
const fake = (name) => ['url = https://admin', ':made-up-pass', `@${name}.example.invalid/x\n`].join('');
const marked = (name) => `${fake(name).trimEnd()} # trufflehog:ignore\n`;
const rtf = '{\\rtf1\\ansi Hello.\\par}\n';

function repository() {
  const root = mkdtempSync(join(tmpdir(), 'bearly-hooks-'));
  const work = join(root, 'work');
  mkdirSync(join(work, '.githooks'), { recursive: true });
  const git = (...args) => spawnSync('git', args, { cwd: work, encoding: 'utf8' });
  git('init', '-q', '-b', 'main');
  for (const [key, value] of [['user.name', 'probe'], ['user.email', 'probe@test.invalid'], ['core.autocrlf', 'false']]) git('config', key, value);
  for (const hook of ['pre-commit', 'pre-push']) {
    copyFileSync(join(hooks, hook), join(work, '.githooks', hook));
    chmodSync(join(work, '.githooks', hook), 0o755);
  }
  return {
    root,
    work,
    // Without the hooks: a commit made before they were switched on, or on another machine.
    git,
    // With them, as every clone of a project has them.
    hooked: (...args) => git('-c', 'core.hooksPath=.githooks', ...args),
    write(name, text) {
      mkdirSync(dirname(join(work, name)), { recursive: true });
      writeFileSync(join(work, name), text);
    },
    leftovers: () => readdirSync(join(work, '.git')).filter((name) => name.startsWith('trufflehog')),
  };
}

test('pre-commit stops a secret however the commit is made, and lets everything else through', { skip }, () => {
  const { root, work, git, hooked, write, leftovers } = repository();
  try {
    write('kept.txt', 'one\n');
    write('other.txt', 'two\n');
    git('add', '-A');
    const first = hooked('commit', '-q', '-m', 'base');
    assert.equal(first.status, 0, `the first commit of a repository, clean: ${first.stderr}`);

    const stopped = (how, result) => {
      assert.notEqual(result.status, 0, `${how}: the commit went through`);
      assert.match(result.stderr, /pre-commit: TruffleHog found a secret in the staged files/, how);
      git('reset', '-q', '--hard', 'HEAD');
      git('clean', '-qfd');
    };

    write('new.txt', fake('added'));
    git('add', 'new.txt');
    stopped('git add, then git commit', hooked('commit', '-q', '-m', 'x'));

    // For these two git commits from an index of its own, which TruffleHog's git scan never sees.
    appendFileSync(join(work, 'kept.txt'), fake('all'));
    stopped('git commit -a', hooked('commit', '-q', '-a', '-m', 'x'));

    appendFileSync(join(work, 'kept.txt'), fake('path'));
    write('other.txt', 'two\nthree\n');
    git('add', 'other.txt');
    stopped('git commit <path>', hooked('commit', '-q', 'kept.txt', '-m', 'x'));

    // Under Git for Windows, git's own diff stops at the .rtf: what sorts after it went unread.
    write('m-doc.rtf', rtf);
    write('z-after.txt', fake('after'));
    git('add', '-A');
    stopped('a .rtf, and a secret in a file that sorts after it', hooked('commit', '-q', '-m', 'x'));

    write('doc.rtf', rtf);
    write('a folder/with space.txt', 'fine\n');
    write('fixture.txt', marked('fixture'));
    git('rm', '-q', 'other.txt');
    git('add', '-A');
    const through = hooked('commit', '-q', '-m', 'a harmless .rtf, a path with a space, a marked fake, a deleted file');
    assert.equal(through.status, 0, through.stderr);

    assert.deepEqual(leftovers(), [], 'no copy of the staged files is left in .git');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('pre-push stops a secret anywhere in what a push would send, and scans a whole history on request', { skip }, () => {
  const { root, git, hooked, write, leftovers } = repository();
  try {
    spawnSync('git', ['init', '-q', '--bare', join(root, 'origin.git')]);
    git('remote', 'add', 'origin', '../origin.git');
    write('kept.txt', 'one\n');
    git('add', '-A');
    git('commit', '-q', '-m', 'base');
    const first = hooked('push', '-q', '-u', 'origin', 'main');
    assert.equal(first.status, 0, `the first push of a repository, clean: ${first.stderr}`);

    const commit = (message) => {
      git('add', '-A');
      git('commit', '-q', '-m', message);
    };
    const stopped = (what, ...push) => {
      const result = hooked('push', '-q', ...push);
      assert.notEqual(result.status, 0, `${what}: the push went through`);
      assert.match(result.stderr, /pre-push: TruffleHog found a secret in a commit this push would send/, what);
    };
    const back = () => git('reset', '-q', '--hard', 'origin/main');

    write('leak.txt', fake('gone'));
    commit('adds it');
    git('rm', '-q', 'leak.txt');
    commit('takes it out again');
    stopped('a secret added in one commit and removed in the next', 'origin', 'main');
    back();

    write('z-old.txt', fake('old'));
    commit('the older commit');
    write('m-doc.rtf', rtf);
    commit('the newer commit, with an .rtf');
    stopped('a .rtf in the newest commit, a secret in an older one', 'origin', 'main');
    back();

    write('x.txt', 'x\n');
    commit(`note: ${fake('message').trim()}`);
    stopped('a secret in a commit message and nowhere else', 'origin', 'main');
    back();

    git('switch', '-q', '-c', 'feature');
    write('b.txt', fake('branch'));
    commit('on a branch the remote has never seen');
    stopped('a new branch', '-u', 'origin', 'feature');
    git('switch', '-q', 'main');
    git('branch', '-q', '-D', 'feature');

    git('switch', '-q', '-c', 'side');
    write('ok.txt', 'ok\n');
    commit('fine');
    git('switch', '-q', 'main');
    git('merge', '-q', '--no-ff', 'side', '-m', 'merge side');
    write('fixture.txt', marked('fixture'));
    commit('a marked fake');
    const through = hooked('push', '-q', 'origin', 'main');
    assert.equal(through.status, 0, `a merge commit and a marked fake: ${through.stderr}`);

    // By hand, through git so that the shell is git's own on every platform.
    const all = (...extra) => git('-c', 'alias.scan-all=!sh .githooks/pre-push --all', 'scan-all', ...extra);
    assert.equal(all().status, 0, 'a clean history');
    write('deep.txt', fake('deep'));
    commit('adds it');
    git('rm', '-q', 'deep.txt');
    commit('takes it out again');
    const found = all();
    assert.notEqual(found.status, 0, 'a secret two commits back, since removed');
    assert.match(found.stderr, /pre-push: TruffleHog found a secret in the history of this branch/);

    assert.deepEqual(leftovers(), [], 'no copy of the commits is left in .git');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
