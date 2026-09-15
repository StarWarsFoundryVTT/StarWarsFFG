import type { Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Seeds the world with imported content, once per run.
 *
 * Runs the real OggDude importer against a trimmed dataset rather than restoring a saved world.
 */

/** Bump when the fixture XML changes, so existing worlds re-seed. */
const SEED_VERSION = 3;

const FIXTURES = path.resolve(__dirname, '../fixtures/oggdude');

/**
 * Files in the order the importers expect. Skills must land first - later importers resolve
 * skill keys through `CONFIG.temporary.skills`, which the skills import populates.
 */
export const PHASES: { className: string; file: string; dir?: boolean }[] = [
  { className: 'Skills', file: 'Skills.xml' },
  { className: 'ItemModifiers', file: 'ItemDescriptors.xml' },
  { className: 'Armor', file: 'Armor.xml' },
  { className: 'Weapon', file: 'Weapons.xml' },
  { className: 'Gear', file: 'Gear.xml' },
  { className: 'ItemAttachments', file: 'ItemAttachments.xml' },
  { className: 'Talent', file: 'Talents.xml' },
  // A directory, and a different call: `Species.Import` is handed the zip and finds its own files
  // in it, one per species, rather than a document the seed parsed (importers/species.js:16).
  { className: 'Species', file: 'Species', dir: true },
];

/** The files one phase reads, as `Data/`-relative names and their text. */
export function phaseFiles(
  { file, dir }: { file: string; dir?: boolean },
): { name: string; xml: string }[] {
  const names = dir
    ? fs.readdirSync(path.join(FIXTURES, file)).filter((n) => n.endsWith('.xml')).map((n) => `${file}/${n}`)
    : [file];
  return names.map((name) => ({ name, xml: fs.readFileSync(path.join(FIXTURES, name), 'utf8') }));
}

/** Read the fixture XML off disk in Node, to be passed into the page. */
function loadFixtures(skillsFile = 'Skills.xml'): {
  className: string; dir: boolean; files: { name: string; xml: string }[];
}[] {
  return PHASES.map((phase) => ({
    className: phase.className,
    dir: Boolean(phase.dir),
    files: phaseFiles(phase.className === 'Skills' ? { file: skillsFile } : phase),
  }));
}

/** Has this world already been seeded at the current version? */
export async function isSeeded(page: Page): Promise<boolean> {
  return page.evaluate(async (version) => {
    // getCompendiumPack lowercases and strips dots: "oggdude.Armor" -> "world.oggdudearmor"
    if (!game.packs.get('world.oggdudearmor')) return false;
    return game.settings.storage.get('world')?.getItem?.('qa.seedVersion') === String(version);
  }, SEED_VERSION);
}

/**
 * Import the trimmed dataset.
 *
 */
export async function seed(page: Page, { skillsFile = 'Skills.xml' } = {}): Promise<string[]> {
  const files = loadFixtures(skillsFile);

  return page.evaluate(async ({ files, version }) => {
    const log: string[] = [];

    // The importers use CONFIG.temporary as a scratch space
    CONFIG.temporary = {};

    const zip = new JSZip();
    for (const phase of files) {
      for (const f of phase.files) zip.file(`Data/${f.name}`, f.xml);
    }

    // resolved by the browser against the running server; the indirection stops TypeScript
    // trying to resolve a path that only exists at runtime
    const load = (p: string) => import(/* @vite-ignore */ `/systems/starwarsffg/modules/${p}`);
    const OggDude = (await load('importer/oggdude/oggdude.js')).default;
    const ImportHelpers = (await load('importer/import-helpers.js')).default;

    for (const phase of files) {
      const importer = OggDude.Import[phase.className];
      if (!importer) {
        log.push(`SKIP ${phase.className} - no such importer`);
        continue;
      }
      const names = phase.files.map((f: any) => f.name).join(', ');
      if (phase.dir) {
        // it reads the zip itself, so there is nothing to parse here
        await importer(zip);
      } else {
        const xmlDoc = ImportHelpers.stringToXml(phase.files[0].xml);
        // Skills takes a "create journal compendium" flag rather than the zip
        await (phase.className === 'Skills' ? importer(xmlDoc, false) : importer(xmlDoc, zip));
      }
      log.push(`OK   ${phase.className} from ${names}`);
    }

    await game.settings.storage.get('world')?.setItem?.('qa.seedVersion', String(version));
    CONFIG.temporary = {};
    return log;
  }, { files, version: SEED_VERSION });
}

/**
 * Remove everything the seed created.
 * Only for rebuilding a seed - tests clean up after themselves via the world fixture.
 */
/** Packs the seed creates, for lookups and teardown. */
export const SEED_PACKS = {
  armour: 'oggdude.Armor',
  weapon: 'oggdude.Weapons',
  gear: 'oggdude.Gear',
  armourAttachment: 'oggdude.ArmorAttachments',
  weaponAttachment: 'oggdude.WeaponAttachments',
  armourMod: 'oggdude.ArmorMods',
  weaponMod: 'oggdude.WeaponMods',
  genericMod: 'oggdude.GenericMods',
  talent: 'oggdude.Talents',
} as const;

export async function unseed(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const packs = game.packs.filter((p: any) => p.collection.startsWith('world.oggdude'));
    for (const pack of packs) await pack.deleteCompendium();
    await game.settings.storage.get('world')?.removeItem?.('qa.seedVersion');
  });
}
