// What git knows about the project, for serve.mjs: which worktrees exist and which of them an
// agent holds, where each story, sprint and plan branch stands, and which stories a sprint
// branch already holds. Every command here only reads.
//
// It reads two shapes (ADR-0011). Today a story is built on story/S-012.3-slug and becomes one
// commit on sprint/S-012 that names its id. Before, a task was built on task/T-012.3-slug and
// merged into a numbered sprint branch, and a planning session used story/ and card/ branches.

import { spawnSync } from 'node:child_process';
import { accessSync, constants, statSync } from 'node:fs';
import { basename, delimiter, isAbsolute, join } from 'node:path';

const WINDOWS = process.platform === 'win32';

function startable(file) {
  try {
    if (!statSync(file).isFile()) return false;
    if (!WINDOWS) accessSync(file, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * The installed git, by its full path, or null. Started by its bare name, Windows would run a
 * git.exe lying in the current folder - the project - before the one on PATH. So the folders
 * PATH names are searched here, in their order, and the current folder never is.
 */
export function findGit(env = process.env) {
  // The endings Windows adds to a name, in its order. Only .com and .exe start without a
  // shell, and git is never started through one.
  const endings = WINDOWS ? (env.PATHEXT || '.COM;.EXE').split(';').filter((ending) => /^\.(com|exe)$/i.test(ending)) : [''];
  for (const folder of (env.PATH ?? '').split(delimiter)) {
    // A folder that is not named in full is the current one, or one found from it.
    if (!isAbsolute(folder)) continue;
    for (const ending of endings) {
      const candidate = join(folder, `git${ending.toLowerCase()}`);
      if (startable(candidate)) return candidate;
    }
  }
  return null;
}

/** Found once, when this module loads. */
export const gitPath = findGit();

/** Runs git in a folder and gives its output as UTF-8 text, or null when git reports failure. */
export function runGit(folder, args) {
  if (!gitPath) return null;
  // fsmonitor names a program in the repository's own configuration. Reading must not run it.
  const done = spawnSync(gitPath, ['-c', 'core.fsmonitor=false', ...args], {
    cwd: folder,
    encoding: 'utf8',
    maxBuffer: Infinity, // a large repository lists more than the megabyte Node allows by default
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  return done.status === 0 ? done.stdout : null;
}

/**
 * Where pull request numbers link to: the host and the owner/repository path, nothing else.
 * A remote URL can carry a token, as its user part or as a query, and none of it may reach a
 * page - so a URL of any other shape gives no link at all.
 */
export function publicRemote(url) {
  const shape = /^(?:https?:\/\/|ssh:\/\/)?(?:[^/]*@)?([A-Za-z0-9.-]+\.[A-Za-z]{2,})[:/]([\w.-]+\/[\w.-]+?)(?:\.git)?\/?$/i;
  const found = shape.exec(String(url ?? '').trim());
  return found ? `https://${found[1]}/${found[2]}` : '';
}

const linesOf = (text) => text.split('\n').map((line) => line.replace(/\r+$/, ''));

/** The worktrees, the branches and what each sprint branch holds - or null where git cannot say. */
export function gitState(root) {
  const listed = runGit(root, ['worktree', 'list', '--porcelain']);
  if (listed === null) return null;
  const worktrees = [];
  let current = null;
  for (const line of linesOf(listed)) {
    const path = /^worktree (.+)$/.exec(line)?.[1];
    if (path) {
      current = { name: basename(path), head: '', branch: '', detached: false, locked: false, main: worktrees.length === 0 };
      worktrees.push(current);
      continue;
    }
    if (!current) continue;
    const head = /^HEAD ([0-9a-f]+)$/.exec(line)?.[1];
    const branch = /^branch refs\/heads\/(.+)$/.exec(line)?.[1];
    if (head) current.head = head;
    else if (branch) current.branch = branch;
    else if (line === 'detached') current.detached = true;
    else if (/^locked/.test(line)) current.locked = true;
  }

  const defaultBranch = ['main', 'master'].find((name) => runGit(root, ['rev-parse', '--verify', '--quiet', `refs/heads/${name}`]) !== null) ?? '';

  // ahead-behind needs git 2.41; an older git still lists the branches, without the counts.
  const refs = ['refs/heads/task', 'refs/heads/sprint', 'refs/heads/story', 'refs/heads/card', 'refs/heads/plan'];
  const format = (counts) => `--format=%(refname:short)%09%(objectname)%09%(committerdate:unix)%09${counts}%09%(subject)`;
  const counted = defaultBranch ? runGit(root, ['for-each-ref', format(`%(ahead-behind:${defaultBranch})`), ...refs]) : null;
  const branches = [];
  for (const line of linesOf(counted ?? runGit(root, ['for-each-ref', format(''), ...refs]) ?? '')) {
    const parts = line.split('\t');
    if (parts.length < 5) continue;
    const counts = parts[3].split(' ');
    const [ahead, behind] = counts.length === 2 ? counts.map(Number) : [null, null];
    // Five fields, split at the tabs: a subject that holds a tab of its own ends at it.
    branches.push({ name: parts[0], head: parts[1], time: Number(parts[2]), ahead, behind, subject: parts[4] });
  }

  const merged = {};
  const landed = {};
  for (const sprint of branches) {
    if (!/^sprint\//.test(sprint.name)) continue;
    const into = runGit(root, ['branch', '--merged', sprint.name, '--list', 'task/*', '--format=%(refname:short)']) ?? '';
    merged[sprint.name] = into.split('\n').map((name) => name.trim()).filter(Boolean);

    // A story is in once the sprint branch holds a commit whose subject closes with its id -
    // "feat: the dialog copies the link (S-012.2)" - and that commit has not been reverted.
    // A revert's subject wraps the one it undoes in: Revert "...". Each wrap flips the sign.
    const count = new Map();
    const subjects = defaultBranch ? runGit(root, ['log', '-n', '2000', '--format=%s', `${defaultBranch}..${sprint.name}`]) : null;
    for (const subject of linesOf(subjects ?? '')) {
      const found = /^((?:Revert ")*).*\((S-\d+\.\d+)\)"*$/.exec(subject);
      if (!found) continue;
      const sign = (found[1].length / 8) % 2 === 1 ? -1 : 1;
      count.set(found[2], (count.get(found[2]) ?? 0) + sign);
    }
    landed[sprint.name] = [...count].filter(([, times]) => times > 0).map(([id]) => id).sort();

    // A story branch is cut from its sprint branch, so against main it is ahead by the whole
    // sprint. What counts as its work is what it has beyond the sprint branch.
    for (const story of branches) {
      if (!/^story\/S-\d+\.\d+/i.test(story.name)) continue;
      const own = (runGit(root, ['rev-list', '--count', `${sprint.name}..${story.name}`]) ?? '').trim();
      if (/^\d+$/.test(own)) story.ahead = Number(own);
    }
  }

  return { defaultBranch, worktrees, branches, merged, landed };
}
