import { test, expect } from '../../support/fixtures';

/**
 * What the SWA adversaries importer produced, from a zip built in the page.
 */

const ZIP_NAME = 'qa-swa-2368.zip';

/** Import one adversary with `fields` laid over a stock rival, and read back what it became. */
async function importAdversary(page, fields) {
  return page.evaluate(async ({ zipName, fields }) => {
    const load = (p) => import(/* @vite-ignore */ `/systems/starwarsffg/modules/${p}`);
    const SWAImporter = (await load('importer/swa-importer.js')).default;

    const zip = new JSZip();
    for (const name of ['skills', 'weapons', 'force-powers', 'talents', 'mods', 'qualities']) {
      zip.file(`data/${name}.json`, '[]');
    }
    // as in the real data, which the importer cannot run without when an adversary names an ability
    zip.file('data/abilities.json', JSON.stringify([{ name: 'Silhouette', description: 'Its size.' }]));
    const adversary = { name: 'QA Thug', type: 'rival', characteristics: { Brawn: 3 }, ...fields };
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
      const weapons = actor.items.filter((item) => item.type === 'weapon').map((item) => ({
        name: item.name,
        useBrawn: item.system.skill.useBrawn,
        characteristic: item.system.characteristic.value,
      }));
      return { weapons, silhouette: actor.system.stats.silhouette.value };
    } finally {
      await game.packs.find((p) => p.metadata.label === label)?.deleteCompendium();
    }
  }, { zipName: ZIP_NAME, fields });
}

test('#2368 a Brawn-based SWA weapon adds Brawn to its damage', async ({ page }) => {
  const { weapons: imported } = await importAdversary(page, { weapons: [
    { name: 'QA Fists', skill: 'Brawl', 'plus-damage': '1', critical: '5', range: 'Engaged' },
    { name: 'QA Blaster', skill: 'Ranged (Light)', damage: '6', critical: '3', range: 'Medium' },
  ] });
  const byName = Object.fromEntries(imported.map((weapon) => [weapon.name, weapon]));

  expect(byName['QA Fists'].useBrawn, 'a Brawl weapon with no base damage is flagged').toBe(true);
  expect(byName['QA Fists'].characteristic, 'and Brawn is the characteristic it adds').toBe('Brawn');
  expect(byName['QA Blaster'].characteristic, 'while a blaster adds none').toBe('');
});
