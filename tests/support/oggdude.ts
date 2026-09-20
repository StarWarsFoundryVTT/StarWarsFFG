import fs from 'node:fs';
import path from 'node:path';
import type { ConsoleMessage, Page } from '@playwright/test';
import { PHASES, phaseFiles } from './seed';

/**
 * The trimmed OggDude dataset, read from the test's side.
 */

const FIXTURES = path.resolve(__dirname, '../fixtures/oggdude');

/** The phase a given importer belongs to, by class name. */
const PHASE_FOR = Object.fromEntries(PHASES.map((phase) => [phase.className, phase]));

/** One of the fixture files, as text. */
export function fixtureXml(file: string): string {
  const full = path.join(FIXTURES, file);
  if (!fs.existsSync(full)) {
    throw new Error(`No fixture XML at ${full}. It holds: ${fs.readdirSync(FIXTURES).join(', ')}.`);
  }
  return fs.readFileSync(full, 'utf8');
}

/**
 * One record from a fixture file, as the importer sees it.
 */
export async function record(
  page: Page, file: string, key: string,
): Promise<Record<string, any>> {
  const found = await page.evaluate(async ({ xml, key }) => {
    const load = (p: string) => import(/* @vite-ignore */ `/systems/starwarsffg/modules/${p}`);
    const ImportHelpers = (await load('importer/import-helpers.js')).default;

    const base = JXON.xmlToJs(ImportHelpers.stringToXml(xml));
    // <Armors><Armor>… - the outer element names the collection and the inner one the record,
    // and neither is worth spelling out at every call site.
    const collection = Object.values(base)[0] as Record<string, any>;
    // A species file holds one record and no collection around it, which is why the importer is
    // handed the whole directory rather than a file.
    const list = collection?.Key
      ? [collection]
      : (() => {
        const records = Object.values(collection ?? {})[0];
        return Array.isArray(records) ? records : [records];
      })();

    return {
      record: list.find((entry: any) => entry?.Key === key) ?? null,
      keys: list.map((entry: any) => String(entry?.Key ?? '?')),
    };
  }, { xml: fixtureXml(file), key });

  if (!found.record) {
    throw new Error(`No record keyed "${key}" in ${file}. It holds: ${found.keys.join(', ')}.`);
  }
  return found.record;
}

/**
 * Run one importer against XML of the test's choosing, in the test's own page.
 */
export async function runImport(
  page: Page, className: string, xml: string, { file = `${className}.xml`, dir = false } = {},
): Promise<string[]> {
  return run(page, className, [{ name: file, xml }], dir);
}

/**
 * Shared by both ways in: ad-hoc XML, and a phase run again from its own files.
 */
async function run(
  page: Page, className: string, files: { name: string; xml: string }[], dir: boolean,
): Promise<string[]> {
  const complaints: string[] = [];
  const onConsole = (msg: ConsoleMessage) => {
    if (msg.type() === 'error') complaints.push(msg.text());
  };
  page.on('console', onConsole);

  const problem = await page.evaluate(async ({ className, files, dir, skills }) => {
    const load = (p: string) => import(/* @vite-ignore */ `/systems/starwarsffg/modules/${p}`);
    const OggDude = (await load('importer/oggdude/oggdude.js')).default;
    const ImportHelpers = (await load('importer/import-helpers.js')).default;

    const importer = OggDude.Import[className];
    if (!importer) {
      return `no importer called "${className}". It has: ${Object.keys(OggDude.Import).join(', ')}.`;
    }

    CONFIG.temporary ??= {};
    /*
     * The importer caches a snapshot of a pack the first time it looks an id up in it, and decides
     * from that snapshot which of an item's keys the new data no longer has. A real import starts
     * from a fresh session, so the snapshots are dropped here - keeping `skills`, which the skill
     * key mapping is read from.
     */
    for (const cached of Object.keys(CONFIG.temporary)) {
      if (cached !== 'skills') delete CONFIG.temporary[cached];
    }
    if (!CONFIG.temporary.skills && className !== 'Skills') {
      await OggDude.Import.Skills(ImportHelpers.stringToXml(skills), false);
    }

    const zip = new JSZip();
    for (const f of files) zip.file(`Data/${f.name}`, f.xml);

    if (dir) {
      // it reads its files out of the zip itself
      await importer(zip);
      return null;
    }

    // Skills takes a "create journal compendium" flag where the others take the zip
    const parsed = ImportHelpers.stringToXml(files[0].xml);
    await (className === 'Skills' ? importer(parsed, false) : importer(parsed, zip));
    return null;
  }, { className, files, dir, skills: fixtureXml('Skills.xml') }).finally(() => {
    page.off('console', onConsole);
  });

  if (problem) {
    throw new Error(`Importing ${files.map((f) => f.name).join(', ')}: ${problem}`);
  }
  return complaints;
}

/**
 * Run a seeded phase again, from the same file globalSetup used.
 */
export async function reimport(page: Page, className: string): Promise<string[]> {
  const phase = PHASE_FOR[className];
  if (!phase) {
    throw new Error(
      `"${className}" is not one of the seeded phases. They are: ${Object.keys(PHASE_FOR).join(', ')}.`,
    );
  }
  return run(page, className, phaseFiles(phase), Boolean(phase.dir));
}
