import { test, expect } from '../../support/fixtures';
import * as api from '../../support/api';

/**
 * The compendium browser filters on an entry's own stats and source book, not only its tags.
 */

const BROWSER = '/systems/starwarsffg/modules/compendium/compendium-browser.js';

async function seedWeapons(page, world, prefix) {
  const { pack } = await api.ensurePack(page, 'qa-fixtures');
  const weapons = [
    { name: `${prefix}-a`, rarity: 7, sources: ['QA Sourcebook pg.12'] },
    { name: `${prefix}-b`, rarity: 7, sources: ['QA Other Sourcebook pg.3'] },
    { name: `${prefix}-c`, rarity: 3, sources: ['QA Sourcebook pg.40'] },
  ];
  for (const w of weapons) {
    world.track(await api.createInPack(page, pack, {
      type: 'weapon',
      name: w.name,
      system: {
        rarity: { value: w.rarity },
        metadata: { sources: w.sources },
      },
    }));
  }
}

async function openBrowser(page, search) {
  await page.evaluate(async (path) => {
    const { default: CompendiumBrowser } = await import(path);
    await new CompendiumBrowser().render(true);
  }, BROWSER);
  const app = page.locator('#swffg-compendium-browser');
  await app.locator('input[name="swffg-cb-search"]').fill(search);
  return app;
}

test.afterEach(async ({ page }) => {
  await page.evaluate(() => foundry.applications.instances.get('swffg-compendium-browser')?.close());
});

test('weapons can be filtered by rarity', async ({ page, world }) => {
  const prefix = `qa-cbstat-${Date.now()}`;
  await seedWeapons(page, world, prefix);
  const app = await openBrowser(page, prefix);
  const titles = app.locator('.cb-entry-title');
  await expect(titles, 'all three before filtering').toHaveCount(3);

  await app.locator('select[data-stat="system.rarity.value"]').selectOption('7');
  await expect(titles, 'only the rarity 7 weapons').toHaveText([`${prefix}-a`, `${prefix}-b`]);

  await app.locator('select[data-stat="system.rarity.value"]').selectOption('');
  await expect(titles, 'any rarity shows them all again').toHaveCount(3);
});

test('a numeric stat can be compared rather than matched', async ({ page, world }) => {
  const prefix = `qa-cbcompare-${Date.now()}`;
  await seedWeapons(page, world, prefix);
  const app = await openBrowser(page, prefix);
  const titles = app.locator('.cb-entry-title');

  await app.locator('select[data-stat="system.rarity.value"]').selectOption('3');
  await app.locator('select[data-stat-op="system.rarity.value"]').selectOption('>');
  await expect(titles, 'only what is rarer than 3').toHaveText([`${prefix}-a`, `${prefix}-b`]);

  await app.locator('select[data-stat="system.rarity.value"]').selectOption('7');
  await app.locator('select[data-stat-op="system.rarity.value"]').selectOption('<');
  await expect(titles, 'only what is less rare than 7').toHaveText([`${prefix}-c`]);

  await app.locator('select[data-stat-op="system.rarity.value"]').selectOption('<=');
  await expect(titles, 'and 7 itself once it is inclusive').toHaveCount(3);
});

test('text stats are matched exactly, with no comparison', async ({ page, world }) => {
  const prefix = `qa-cbtext-${Date.now()}`;
  await seedWeapons(page, world, prefix);
  const app = await openBrowser(page, prefix);

  await expect(app.locator('select[data-stat="system.skill.value"]'), 'skill is filterable').toHaveCount(1);
  await expect(app.locator('select[data-stat-op="system.skill.value"]'), 'but not comparable').toHaveCount(0);
});

test('weapons can be filtered by source book, whatever the page', async ({ page, world }) => {
  const prefix = `qa-cbsource-${Date.now()}`;
  await seedWeapons(page, world, prefix);
  const app = await openBrowser(page, prefix);

  await app.locator('select[data-stat="source"]').selectOption('QA Sourcebook');
  await expect(app.locator('.cb-entry-title'), 'both pages of the book').toHaveText([`${prefix}-a`, `${prefix}-c`]);
});
