import { test, expect } from '../../support/fixtures';

/**
 * Vehicle stat modifiers.
 */

test('critical damage raises vehicle armour', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'vehicle',
    item: 'criticaldamage',
    // "Armour" is the option's value; "Armor" is only its label (SWFFG.ItemsArmor). The original
    // test selected by label through the sheet, which Playwright resolves either way - going
    // through the API there is no dropdown to do that translation.
    attributes: [{ modtype: 'Vehicle Stat', mod: 'Armour', value: 1 }],
    actorOverrides: { stats: { armour: { value: 0, adjusted: 0 } } },
  });

  expect(await consumers.stat(ctx, 'Armor')).toBe(1);
});

test('a ship weapon modifier raises vehicle armour', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'vehicle',
    item: 'shipweapon',
    attributes: [{ modtype: 'Vehicle Stat', mod: 'Armour', value: 3 }],
    actorOverrides: { stats: { armour: { value: 0, adjusted: 0 } } },
  });

  expect(await consumers.stat(ctx, 'Armour')).toBe(3);
});

test('a ship attachment consumes hardpoints and adds encumbrance', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'vehicle',
    item: 'shipattachment',
    itemOverrides: {
      encumbrance: { value: 5, adjusted: 5 },
      hardpoints: { value: 3, adjusted: 3 },
    },
  });

  expect(await consumers.stat(ctx, 'VehicleEncumbrance'), 'encumbrance').toBe(5);
  // the original asserted -3: hardpoints used are subtracted from the vehicle's free customization
  expect(await consumers.stat(ctx, 'CustomizationHardPoints'), 'hardpoints remaining').toBe(2);
});
