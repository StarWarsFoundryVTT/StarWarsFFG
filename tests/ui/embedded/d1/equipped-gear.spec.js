import { test, expect } from '../../../support/fixtures';
import * as api from '../../../support/api';

/**
 * Armour, weapons, and gear only contribute while equipped and stop contributing when unequipped.
 */

async function toggleEquipped(page, ctx) {
  const windowId = await api.openSheet(page, ctx.actor);
  const sheet = page.locator(`#${windowId}`);
  await sheet.locator('.sheet-tabs [data-tab="items"]').first().click();
  const itemId = ctx.item.split('.').pop();
  await sheet.locator(`li.item[data-item-id="${itemId}"] .toggle-equipped`).click();
}

test('armour soak and defence apply only while equipped', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'armour',
    equipped: false,
    itemOverrides: {
      soak: { value: 2, adjusted: 2 },
      defence: { value: 1, adjusted: 1 },
      encumbrance: { value: 5, adjusted: 5 },
    },
  });

  expect(await consumers.stat(ctx, 'Soak'), 'soak is unchanged when item is unequipped').toBe(3);
  expect(await consumers.stat(ctx, 'Defence-Ranged'), 'defense is unchanged when item is unequipped').toBe(0);

  await world.equip(ctx, true);
  expect(await consumers.stat(ctx, 'Soak'), 'soak is changed when item is equipped').toBe(3 + 2)
  expect(await consumers.stat(ctx, 'Defence-Ranged'), 'defense (ranged) is changed when item is equipped').toBe(0 + 1);
  expect(await consumers.stat(ctx, 'Defence-Melee'), 'defense (melee) is changed when item is equipped').toBe(0 + 1);

  await world.equip(ctx, false);
  expect(await consumers.stat(ctx, 'Soak'), 'soak is unchanged when item is unequipped again').toBe(3);
  expect(await consumers.stat(ctx, 'Defence-Ranged'), 'defense (ranged) is unchanged when item is unequipped again').toBe(0);
  expect(await consumers.stat(ctx, 'Defence-Melee'), 'defense (melee) is unchanged when item is unequipped again').toBe(0);
});

test('carried weapons count toward encumbrance', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'weapon',
    equipped: false,
    itemOverrides: { encumbrance: { value: 5, adjusted: 5 } },
  });

  expect(await consumers.stat(ctx, 'Encumbrance'), 'encumbrance is increased with item added').toBe(5);
});

test('#1580 gear grants its mods only while equipped', async ({ world, consumers, page }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'gear',
    attributes: [
      {
        modtype: 'Stat',
        mod: 'Soak',
        value: 1,
      },
    ],
    itemOverrides: {
      encumbrance: {
        value: 4,
        adjusted: 4,
      },
    },
  });
  const equipped = await consumers.stat(ctx, 'Soak');

  await toggleEquipped(page, ctx);
  await expect.poll(() => consumers.stat(ctx, 'Soak'), { message: 'unequipped gear adds no soak' }).toBe(equipped - 1);
  expect(await consumers.stat(ctx, 'Encumbrance'), 'but is still encumbering').toBe(4);

  await toggleEquipped(page, ctx);
  await expect.poll(() => consumers.stat(ctx, 'Soak'), { message: 'and again once equipped' }).toBe(equipped);
});
