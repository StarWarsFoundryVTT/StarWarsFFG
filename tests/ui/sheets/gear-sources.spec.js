import { test, expect } from '../../support/fixtures';

/**
 * Where a modified value in the gear list says its modifiers came from - the same popup the skill
 * dice pools show.
 */

test('#2359 a modified armour value lists its sources', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'armour',
    attributes: [{ modtype: 'Armor Stat', mod: 'defence', value: 1 }],
  });

  expect(
    await consumers.gearSources(ctx, 'Defence'),
    'the armour row names what raised its defense',
  ).toEqual([`${ctx.itemName}: +1`]);

  expect(
    await consumers.gearSources(ctx, 'Soak'),
    'and its unmodified soak has no popup',
  ).toEqual([]);
});

test('#2359 a modified weapon range lists its sources', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'weapon',
    attributes: [{ modtype: 'Weapon Stat', mod: 'range', value: 1 }],
  });

  expect(
    await consumers.gearSources(ctx, 'Range'),
    'the range band names what moved it',
  ).toEqual([`${ctx.itemName}: +1`]);
});
