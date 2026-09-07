import { test, expect } from '../../../support/fixtures';

/**
 * Armour and weapons only contribute while equipped, and stop contributing when unequipped.
 */

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

  expect(await consumers.stat(ctx, 'Soak'), 'unequipped').toBe(3);
  expect(await consumers.stat(ctx, 'Defence-Ranged'), 'unequipped').toBe(0);

  await world.equip(ctx, true);
  expect(await consumers.stat(ctx, 'Soak'), 'equipped').toBe(3 + 2)
  expect(await consumers.stat(ctx, 'Defence-Ranged'), 'equipped').toBe(1);
  expect(await consumers.stat(ctx, 'Defence-Melee'), 'equipped').toBe(1);

  await world.equip(ctx, false);
  expect(await consumers.stat(ctx, 'Soak'), 'unequipped again').toBe(3);
  expect(await consumers.stat(ctx, 'Defence-Ranged'), 'unequipped again').toBe(0);
  expect(await consumers.stat(ctx, 'Defence-Melee'), 'unequipped again').toBe(0);
});

test('carried weapons count toward encumbrance', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'weapon',
    equipped: false,
    itemOverrides: { encumbrance: { value: 5, adjusted: 5 } },
  });

  expect(await consumers.stat(ctx, 'Encumbrance')).toBe(5);
});
