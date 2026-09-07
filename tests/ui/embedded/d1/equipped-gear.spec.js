import { test, expect } from '../../../support/fixtures';

/**
 * Armour and weapons only contribute while equipped, and stop contributing when unequipped.
 */

test.fixme('armour soak and defence apply only while equipped', async ({ world, consumers }) => {
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

  // FIXME: these two items currently fail since AEs apply when an item is added, regardless of equip state
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
