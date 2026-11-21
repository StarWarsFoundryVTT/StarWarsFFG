import { test, expect } from '../../../support/fixtures';
import * as api from '../../../support/api';

/**
 * #1960 - weapons, armour and gear can be stowed from the actor sheet. A stowed item isn't carried,
 * so it adds no encumbrance and grants none of its mods.
 */

async function toggleStowed(page, ctx) {
  const windowId = await api.openSheet(page, ctx.actor);
  const sheet = page.locator(`#${windowId}`);
  await sheet.locator('.sheet-tabs [data-tab="items"]').first().click();
  const itemId = ctx.item.split('.').pop();
  await sheet.locator(`li.item[data-item-id="${itemId}"] .toggle-stowed`).click();
}

test('#1960 stowed gear adds no encumbrance', async ({ world, consumers, page }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'gear',
    itemOverrides: {
      encumbrance: { value: 4, adjusted: 4 },
    },
  });

  expect(await consumers.stat(ctx, 'Encumbrance'), 'carried gear is encumbering').toBe(4);

  await toggleStowed(page, ctx);
  await expect.poll(() => consumers.stat(ctx, 'Encumbrance'), { message: 'stowed gear is not' }).toBe(0);

  await toggleStowed(page, ctx);
  await expect.poll(() => consumers.stat(ctx, 'Encumbrance'), { message: 'and is again once carried' }).toBe(4);
});

test('#1960 stowed gear grants none of its mods', async ({ world, consumers, page }) => {
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
  });
  const carried = await consumers.stat(ctx, 'Soak');

  await toggleStowed(page, ctx);
  await expect.poll(() => consumers.stat(ctx, 'Soak'), { message: 'stowed gear grants no soak' }).toBe(carried - 1);
});

test('#1960 stowing equipped armour unequips it', async ({ world, consumers, page }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'armour',
    equipped: true,
    itemOverrides: {
      soak: { value: 2, adjusted: 2 },
      encumbrance: { value: 5, adjusted: 5 },
    },
  });
  const worn = await consumers.stat(ctx, 'Soak');

  await toggleStowed(page, ctx);
  await expect.poll(() => api.read(page, ctx.item, 'system.equippable.equipped')).toBe(false);
  expect(await consumers.stat(ctx, 'Soak'), 'stowed armour grants no soak').toBe(worn - 2);
  expect(await consumers.stat(ctx, 'Encumbrance'), 'nor encumbrance').toBe(0);
});
