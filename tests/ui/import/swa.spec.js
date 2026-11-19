import { test, expect } from '../../support/fixtures';

/**
 * What the SWA adversaries importer produced, from a zip built in the page.
 */

const ZIP_NAME = 'qa-swa-2368.zip';

/** Import one adversary carrying `weapons`, and read back what each weapon became. */
async function importWeapons(page, weapons) {
  return page.evaluate(async ({ zipName, weapons }) => {
    const load = (p) => import(/* @vite-ignore */ `/systems/starwarsffg/modules/${p}`);
    const SWAImporter = (await load('importer/swa-importer.js')).default;

    const zip = new JSZip();
    for (const name of ['skills', 'weapons', 'abilities', 'force-powers', 'talents', 'mods', 'qualities']) {
      zip.file(`data/${name}.json`, '[]');
    }
    const adversary = { name: 'QA Thug', type: 'rival', characteristics: { Brawn: 3 }, weapons };
    zip.file('data/adversaries/qa.json', JSON.stringify([adversary]));
    const blob = await zip.generateAsync({ type: 'blob' });

    const app = new SWAImporter();
    await app._render(true);
    const transfer = new DataTransfer();
    transfer.items.add(new File([blob], zipName));
    document.querySelector('form.data-importer-window input[name=data]').files = transfer.files;

    const event = {
      preventDefault() {},
      stopPropagation() {},
      currentTarget: { dataset: { button: 'import' } },
    };
    const label = zipName.replace(/\.zip$/, '');
    try {
      await app._dialogButton(event);
      const pack = game.packs.find((p) => p.metadata.label === label);
      const [actor] = await pack.getDocuments();
      return actor.items.map((item) => ({
        name: item.name,
        useBrawn: item.system.skill.useBrawn,
        characteristic: item.system.characteristic.value,
      }));
    } finally {
      await game.packs.find((p) => p.metadata.label === label)?.deleteCompendium();
    }
  }, { zipName: ZIP_NAME, weapons });
}

test('#2368 a Brawn-based SWA weapon adds Brawn to its damage', async ({ page }) => {
  const imported = await importWeapons(page, [
    { name: 'QA Fists', skill: 'Brawl', 'plus-damage': '1', critical: '5', range: 'Engaged' },
    { name: 'QA Blaster', skill: 'Ranged (Light)', damage: '6', critical: '3', range: 'Medium' },
  ]);
  const byName = Object.fromEntries(imported.map((weapon) => [weapon.name, weapon]));

  expect(byName['QA Fists'].useBrawn, 'a Brawl weapon with no base damage is flagged').toBe(true);
  expect(byName['QA Fists'].characteristic, 'and Brawn is the characteristic it adds').toBe('Brawn');
  expect(byName['QA Blaster'].characteristic, 'while a blaster adds none').toBe('');
});
