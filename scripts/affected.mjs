#!/usr/bin/env node
/**
 * Work out which tests a change calls for, and print the arguments to run them.
 *
 *   node scripts/affected.mjs [base]        # default base: origin/main
 *   node scripts/affected.mjs --json        # machine-readable, for CI
 *   node scripts/affected.mjs --files a b   # ask about named files instead of git
 *
 * The mapping is data, in tests/map.json. Two rules keep it honest:
 *
 *   - A changed spec always runs itself, mapped or not.
 *   - A changed file under modules/ or templates/ with no rule runs everything, and says so.
 *     Selection is allowed to cost time. It is not allowed to cost coverage.
 *
 * Output is a spec list plus the projects to run them under, because suites that live outside
 * the default project - the opt-in settings ones, and the ones that need a canvas - are
 * invisible to a default run however relevant they are.
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const map = JSON.parse(fs.readFileSync(path.join(root, 'tests/map.json'), 'utf8'));

const escape = (text) => text.replace(/[.+?^${}()|[\]\\]/g, '\\$&');

/** Globs, as the map spells them: `*` stops at a slash, `**` does not. */
function matches(glob, file) {
  const pattern = glob
    .split('**').map((part) => part.split('*').map(escape).join('[^/]*'))
    .join('.*');
  return new RegExp(`^${pattern}$`).test(file);
}

/** Every spec file in the repo, so a glob can be turned into a list. */
function allSpecs() {
  const found = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
      const rel = `${dir}/${entry.name}`;
      if (entry.isDirectory()) walk(rel);
      else if (entry.name.endsWith('.spec.js')) found.push(rel);
    }
  };
  walk('tests');
  return found.sort();
}

/** Which project each spec belongs to, read from the config rather than repeated here. */
function projectFor(specs) {
  const config = fs.readFileSync(path.join(root, 'playwright.config.js'), 'utf8');
  const globs = (name) => {
    const block = config.split(`${name} = [`)[1]?.split('];')[0] ?? '';
    const found = [...block.matchAll(/'([^']+)'/g)].map((m) => m[1]);
    // Read out of the config as text, so a rename or a reformat would quietly return nothing -
    // and a spec filed under the wrong project is ignored by it and runs nowhere at all.
    if (!found.length) throw new Error(`${name} is not a list of globs in playwright.config.js`);
    return found;
  };
  const optIn = globs('NON_DEFAULT_SETTINGS');
  const canvas = globs('CANVAS');
  const hits = (list, spec) => list.some((glob) => matches(glob, spec));

  const projects = new Set();
  for (const spec of specs) {
    // Order matters: the opt-in suites draw scenes too, and they run in their own project.
    if (hits(optIn, spec)) projects.add('non-default-settings');
    else if (hits(canvas, spec)) projects.add('canvas');
    else projects.add('chromium');
  }
  return [...projects].sort();
}

function changedFiles(base) {
  const merged = execFileSync('git', ['merge-base', base, 'HEAD'], { cwd: root }).toString().trim();
  return execFileSync('git', ['diff', '--name-only', merged, '--'], { cwd: root })
    .toString().split('\n').filter(Boolean);
}

function decide(files) {
  const specs = new Set();
  const known = allSpecs();

  for (const file of files) {
    if (map.ignored.some((glob) => matches(glob, file))) continue;

    if (map.everything.some((glob) => matches(glob, file))) {
      return { specs: known, projects: projectFor(known), everything: file };
    }

    if (file.endsWith('.spec.js')) {
      if (known.includes(file)) specs.add(file);
      continue;
    }

    const rules = Object.entries(map.rules).filter(([glob]) => matches(glob, file));
    if (!rules.length) {
      if (file.startsWith('modules/') || file.startsWith('templates/')) {
        return { specs: known, projects: projectFor(known), unmapped: file };
      }
      continue;
    }

    for (const [, globs] of rules) {
      for (const glob of globs) {
        for (const spec of known) if (matches(glob, spec)) specs.add(spec);
      }
    }
  }

  const chosen = [...specs].sort();
  return { specs: chosen, projects: projectFor(chosen) };
}

const args = process.argv.slice(2);
const named = args.indexOf('--files');
const files = named >= 0
  ? args.slice(named + 1).filter((arg) => !arg.startsWith('--'))
  : changedFiles(args.find((arg) => !arg.startsWith('--')) ?? 'origin/main');

const result = decide(files);
const specs = [...result.specs];

if (args.includes('--json')) {
  console.log(JSON.stringify({
    specs,
    projects: result.projects,
    everything: Boolean(result.everything || result.unmapped),
    reason: result.everything ? `${result.everything} is mapped to the whole suite`
      : result.unmapped ? `${result.unmapped} is in no rule, so nothing is assumed`
        : `${files.length} changed file(s)`,
  }, null, 2));
} else if (!specs.length) {
  console.error('# nothing to run: no changed file maps to a test');
} else {
  if (result.everything) console.error(`# ${result.everything} affects everything`);
  if (result.unmapped) console.error(`# ${result.unmapped} is in no rule - running everything`);
  console.log([...result.projects.map((project) => `--project=${project}`), ...specs].join(' '));
}
