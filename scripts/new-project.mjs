#!/usr/bin/env node
// Creates a new project from the scaffold in this repository.
//
// Copies scaffold/ into a new project folder, drops in KICKOFF.md from prompts/kickoff.md, fills
// in the handful of placeholders that are the same for every project, and says which
// placeholders the ideation and the kickoff still have to fill in.
//
// The folder may already exist as long as it is empty, so a folder made first and opened in a
// session can become the project. One that holds anything is refused.
//
// It deliberately leaves the stack placeholders alone ({{LANGUAGE}}, {{LAYER_*}},
// {{VERIFY_COMMAND}} and so on). Those are decisions, and decisions belong in the ideation, not
// in a script's defaults.
//
//   node scripts/new-project.mjs --name my-thing --root ~/code
//   node scripts/new-project.mjs --name my-thing --root ~/code --vault ~/vault --skills ~/skills
//
// With --settings <file> it remembers the three folders from one run to the next: a folder
// given is written to that file, and one left out is read from it.
//
//   node scripts/new-project.mjs --settings <file> --print-settings
//   node scripts/new-project.mjs --settings <file> --name my-thing

import { chmodSync, copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join, parse } from 'node:path';
import { parseArgs } from 'node:util';

import { copyTree, fillIn, findOnPath, folder, refuseIfNotEmpty, stop, templateRoot, today, walk } from './lib.mjs';

const USAGE = 'Usage: node new-project.mjs --name <name> --root <folder> [--vault <folder> | --no-vault] ' +
  '[--skills <folder> | --no-skills] [--settings <file>] [--print-settings]';

let flags;
try {
  ({ values: flags } = parseArgs({
    options: {
      name: { type: 'string' },
      root: { type: 'string' },
      vault: { type: 'string' },
      'no-vault': { type: 'boolean' },
      skills: { type: 'string' },
      'no-skills': { type: 'boolean' },
      settings: { type: 'string' },
      'print-settings': { type: 'boolean' },
    },
  }));
} catch (error) {
  stop(`${error.message}\n${USAGE}`);
}

// --- what earlier runs remembered ----------------------------------------------------------

// A settings path that is no real place is ignored rather than written to: a variable nobody
// filled in leaves "${...}" behind, or a bare file name at the root of the drive.
function settingsFile() {
  if (!flags.settings || flags.settings.includes('${')) return null;
  const path = folder(flags.settings);
  return dirname(path) === parse(path).root ? null : path;
}

const settingsPath = settingsFile();
let remembered = {};
if (settingsPath && existsSync(settingsPath)) {
  try {
    remembered = JSON.parse(readFileSync(settingsPath, 'utf8'));
  } catch {
    stop(`${settingsPath} is not valid JSON. Fix it or delete it, and run this again.`);
  }
}

if (flags['print-settings']) {
  const { root = null, vault = null, skills = null } = remembered;
  console.log(JSON.stringify({ root, vault, skills }, null, 2));
  process.exit(0);
}

// --- where things go ---------------------------------------------------------------------

const name = flags.name;
if (!name) stop(`A project needs a name.\n${USAGE}`);
if (basename(name) !== name || name.startsWith('.')) stop(`"${name}" is no folder name: a name is one word, such as my-thing.`);

const pick = (given, none, kept) => (none ? null : given ? folder(given) : kept ?? null);
const root = pick(flags.root, false, remembered.root);
const vault = pick(flags.vault, flags['no-vault'], remembered.vault);
const skills = pick(flags.skills, flags['no-skills'], remembered.skills);

if (!root) stop(`Where do projects go? Pass --root <folder>.\n${USAGE}`);
if (skills && !existsSync(skills)) stop(`The skills folder ${skills} does not exist.`);

const scaffold = join(templateRoot, 'scaffold');
const target = join(root, name);
if (!existsSync(scaffold)) stop(`No scaffold found at ${scaffold}`);
refuseIfNotEmpty(target);

// --- the project -------------------------------------------------------------------------

console.log(`Creating ${target}`);
copyTree(scaffold, target);

// KICKOFF.md is the brief: /ideate fills it in, /kickoff carries it out.
copyFileSync(join(templateRoot, 'prompts', 'kickoff.md'), join(target, 'KICKOFF.md'));

// On macOS and Linux git runs a hook only if it is executable. Windows has no such bit: there
// the hooks are staged as executable instead, with git add --chmod=+x, in Phase 0.
if (process.platform !== 'win32') {
  for (const hook of readdirSync(join(target, '.githooks'))) chmodSync(join(target, '.githooks', hook), 0o755);
}

// The inspector's port: derived from the name, so every project has its own and two can run
// side by side. tools/inspector/serve.mjs computes the same number when nothing names one.
// The sum goes over the name unit by unit, as the server's does: a loop over characters
// would count a sign outside the basic plane once where the server counts it twice.
let hash = 0;
const lower = name.toLowerCase();
for (let i = 0; i < lower.length; i += 1) hash = (hash * 31 + lower.charCodeAt(i)) % 200;
const inspectorPort = 4700 + hash;

const values = {
  '{{PROJECT_NAME}}': name,
  '{{PROJECT_PATH}}': target,
  '{{YYYY-MM-DD}}': today(),
  '{{INSPECTOR_PORT}}': String(inspectorPort),
};
// Without a vault the placeholder stays, and Phase 0 asks for the path.
const vaultPath = vault ? join(vault, name) : null;
if (vaultPath) values['{{SECRETS_VAULT}}'] = vaultPath;

// Scripts are not in this list: tools/ is vendored, so a project gets it byte for byte, the
// same as every other project's copy.
const TEXT = new Set(['.md', '.json', '.yml', '.yaml', '.example', '.txt', '.gitignore']);
for (const file of walk(target)) {
  const kind = extname(file) || basename(file);   // .gitignore has no extension
  if (!TEXT.has(kind)) continue;
  // _TEMPLATE files are copied again later, per ADR, sprint and story. Today's date in them
  // would end up in every future document.
  if (basename(file).startsWith('_TEMPLATE')) continue;
  fillIn(file, values);
}

// The vault is created but never written to here. The agent confirms the path with the owner
// before putting anything in it (prime directive 17).
if (vaultPath && !existsSync(vaultPath)) {
  mkdirSync(vaultPath, { recursive: true });
  console.log(`Created secrets vault ${vaultPath} (empty)`);
}

// Skills from earlier projects, for the skill writers to start from. Git ignores the folder,
// and Claude Code loads nothing from it (docs/STACK_SKILLS.md).
let drafts = [];
if (skills) {
  drafts = readdirSync(skills, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(skills, entry.name, 'SKILL.md')))
    .map((entry) => entry.name);
  for (const draft of drafts) copyTree(join(skills, draft), join(target, '.claude', 'skill-drafts', draft));
}

if (settingsPath) {
  mkdirSync(dirname(settingsPath), { recursive: true });
  writeFileSync(settingsPath, `${JSON.stringify({ root, vault, skills }, null, 2)}\n`);
}

// --- what is left to do ------------------------------------------------------------------

// What the ideation still has to answer. {{PLACEHOLDER}} is the brief talking about
// placeholders, not a blank to fill.
const skip = [join(target, 'tools'), join(target, '.claude', 'skill-drafts')];
const open = new Set();
for (const file of walk(target)) {
  if (skip.some((dir) => file.startsWith(dir)) || statSync(file).size > 1_000_000) continue;
  for (const [found] of readFileSync(file, 'utf8').matchAll(/\{\{[A-Za-z0-9_-]+\}\}/g)) open.add(found);
}
open.delete('{{PLACEHOLDER}}');

console.log(`\nDone. ${target}\n`);
console.log('Placeholders still to fill in:');
for (const placeholder of [...open].sort()) console.log(`  ${placeholder}`);

if (drafts.length > 0) {
  console.log(`\nSkills from ${skills}, in .claude/skill-drafts/ for the skill writers to start from:`);
  for (const draft of drafts) console.log(`  ${draft}`);
}

// The git hooks refuse every commit and push without TruffleHog (ADR-0009), so say so now.
if (!findOnPath('trufflehog')) {
  console.log('\nTruffleHog is not on the PATH. Phase 0 cannot commit without it: install it first');
  console.log('(docs/SECRETS.md in the new project says how).');
}

console.log(`
Next, each in a fresh Claude Code session opened in ${target}
  1. /ideate <your raw idea>   interviews you in rounds and fills in KICKOFF.md.
  2. /kickoff                  runs Phase 0: asks how many agents may run in parallel, has a
                               skill written for each part of the stack, switches on the
                               TruffleHog hooks and builds the board. GitHub only stores the repo.
  3. /implement                builds one story by hand: it asks which, builds it and stops;
                               you review, commit and push.
     /autopilot                builds the board by itself, for days if need be: a sprint
                               lead per sprint, one commit per story, pushed and deployed
                               once reviewed. Stop the session to turn it off.
     /resolve                  takes you through what waits on you, one input at a time.
                               /ideate, /feature, /fix and /refactor add work at any time;
                               /standup says what to type next; /board shows it in the
                               browser, at http://127.0.0.1:${inspectorPort}.`);
