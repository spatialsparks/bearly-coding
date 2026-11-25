// What both setup scripts share: filling a folder only while it is empty, copying a tree,
// replacing placeholders, and finding a program by its full path.

import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { delimiter, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// The template's root: this file is in scripts/, one level below it.
export const templateRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const today = () => {
  const now = new Date();
  const two = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${two(now.getMonth() + 1)}-${two(now.getDate())}`;
};

// A script that cannot go on says why in one plain line, and exits 1.
export function stop(message) {
  console.error(message);
  process.exit(1);
}

// "~/code" as a shell would read it. Node leaves the tilde alone, and a path that reaches a
// script inside quotes was never seen by a shell.
export function folder(path) {
  const expanded = /^~(?=$|[\\/])/.test(path) ? join(homedir(), path.slice(1)) : path;
  return resolve(expanded);
}

// Filling an empty folder overwrites nothing. One that holds anything is left alone.
export function refuseIfNotEmpty(target) {
  if (existsSync(target) && (!statSync(target).isDirectory() || readdirSync(target).length > 0)) {
    stop(`${target} already exists and is not empty. Refusing to overwrite it.`);
  }
}

export function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

// Copies a folder's contents, hidden files included, byte for byte.
export function copyTree(from, to) {
  mkdirSync(to, { recursive: true });
  for (const entry of readdirSync(from, { withFileTypes: true })) {
    const source = join(from, entry.name);
    const target = join(to, entry.name);
    if (entry.isDirectory()) copyTree(source, target);
    else copyFileSync(source, target);
  }
}

// Replaces each key of `values` in one file, and writes it back only if something changed.
export function fillIn(file, values) {
  const original = readFileSync(file, 'utf8');
  let text = original;
  for (const [key, value] of Object.entries(values)) text = text.split(key).join(value);
  if (text !== original) writeFileSync(file, text);
}

// The full path of a program on PATH, or null. Started by its bare name, Windows would run a
// program of that name lying in the current folder before the installed one.
export function findOnPath(name) {
  const extensions = process.platform === 'win32' ? (process.env.PATHEXT ?? '.EXE;.CMD;.BAT').split(';') : [''];
  for (const dir of (process.env.PATH ?? '').split(delimiter)) {
    if (!dir || dir === '.') continue;
    for (const extension of extensions) {
      const candidate = join(dir, name + extension);
      if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
    }
  }
  return null;
}
