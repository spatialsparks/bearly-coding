#!/usr/bin/env node
// Creates a workspace that is not a software project: a light workspace for tool or content
// work, or a folder for thinking an idea through.
//
// --kind light copies workspaces/light/ (CLAUDE.md, .gitignore, the marker in .claude/) and the
// scaffold's TruffleHog hooks, runs git init on main and points core.hooksPath at .githooks. It
// commits nothing and creates nothing on GitHub: the session does both, after asking.
//
// --kind ideate copies workspaces/ideate/CLAUDE.md and makes an empty sources/ next to it. No
// git, no GitHub: the folder holds notes.
//
// The folder may already exist as long as it is empty. One that holds anything is refused.
// The title and the date are filled in; every bracketed slot is left for the session.
//
//   node scripts/new-workspace.mjs --kind light --path ~/code/tree-maker
//   node scripts/new-workspace.mjs --kind ideate --path ~/ideas/reading-app

import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import { parseArgs } from 'node:util';

import { copyTree, fillIn, findOnPath, folder, refuseIfNotEmpty, stop, templateRoot, today } from './lib.mjs';

const KINDS = ['light', 'ideate'];
const USAGE = `Usage: node new-workspace.mjs --kind <${KINDS.join('|')}> --path <folder>`;

let flags;
try {
  ({ values: flags } = parseArgs({ options: { kind: { type: 'string' }, path: { type: 'string' } } }));
} catch (error) {
  stop(`${error.message}\n${USAGE}`);
}
if (!KINDS.includes(flags.kind) || !flags.path) stop(USAGE);

const target = folder(flags.path);
refuseIfNotEmpty(target);

// Checked before anything is written, so a refusal leaves no half-made folder behind.
const git = flags.kind === 'light' ? findOnPath('git') : null;
if (flags.kind === 'light' && !git) stop('git is not on the PATH. A light workspace keeps its history in git: install it first.');

console.log(`Creating ${target}`);
copyTree(join(templateRoot, 'workspaces', flags.kind), target);

const values = { '{{TITLE}}': basename(target), '{{DATE}}': today() };
for (const file of ['CLAUDE.md', join('.claude', 'bearly.json')]) {
  if (existsSync(join(target, file))) fillIn(join(target, file), values);
}

if (flags.kind === 'ideate') {
  mkdirSync(join(target, 'sources'));
} else {
  copyTree(join(templateRoot, 'scaffold', '.githooks'), join(target, '.githooks'));
  if (process.platform !== 'win32') {
    for (const hook of readdirSync(join(target, '.githooks'))) chmodSync(join(target, '.githooks', hook), 0o755);
  }
  // Git by its full path and without a shell: nothing in the new folder is run.
  const run = (...args) => spawnSync(git, ['-C', target, ...args], { stdio: 'inherit' }).status === 0;
  if (!run('init', '--quiet', '--initial-branch=main')) stop(`git init failed in ${target}`);
  if (!run('config', 'core.hooksPath', '.githooks')) stop(`git config failed in ${target}`);
  if (!findOnPath('trufflehog')) {
    console.log('TruffleHog is not on the PATH: the hooks refuse every commit until it is installed.');
  }
}

console.log(`Done. ${target}`);
