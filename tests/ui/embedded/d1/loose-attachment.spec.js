import { test, expect } from '../../../support/fixtures';
import * as api from '../../../support/api';

/**
 * An attachment can be carried loose in a character's inventory (#1897).
 */

test('#1897 a loose attachment is carried but grants only its encumbrance', async ({ world, consumers, page }) => {
  const ctx = await world.build({ actor: 'character' });
  const soak = await consumers.stat(ctx, 'Soak');
  const attachment = await world.item({
    item: 'itemattachment',
    attributes: [
      {
        modtype: 'Stat',
        mod: 'Soak',
        value: 2,
      },
    ],
    itemOverrides: {
      encumbrance: {
        value: 1,
        adjusted: 1,
      },
    },
  });

  const carried = await api.dropOnActorSheet(page, ctx.actor, attachment);

  const windowId = await api.openSheet(page, ctx.actor);
  const sheet = page.locator(`#${windowId}`);
  await sheet.locator('.sheet-tabs [data-tab="items"]').first().click();
  await expect(
    sheet.locator(`li.item[data-item-id="${carried.split('.').pop()}"]`),
    'it is listed in the inventory',
  ).toBeVisible();
  expect(await consumers.stat(ctx, 'Soak'), 'its mods do not apply').toBe(soak);
  expect(await consumers.stat(ctx, 'Encumbrance'), 'but it is encumbering').toBe(1);
});
