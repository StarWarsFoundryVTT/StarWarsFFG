import { test, expect } from '../../../support/fixtures';

/**
 * A modifier on an attachment, on an item, on an actor.
 */

test('an attachment modifier on armour reaches the actor once equipped', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'armour',
    equipped: false,
    attachment: 'insert',
    attachmentAttributes: [{ modtype: 'Stat', mod: 'Defence-Melee', value: 1 }],
    itemOverrides: { soak: { value: 0, adjusted: 0 }, defence: { value: 0, adjusted: 0 } },
  });

  await world.equip(ctx, true);
  expect(await consumers.stat(ctx, 'Defence-Melee'), 'melee defence from the attachment').toBe(1);
  expect(await consumers.stat(ctx, 'Defence-Ranged'), 'ranged defence untouched').toBe(0);
});

test('an attachment modifier on a weapon reaches the actor', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'weapon',
    equipped: true,
    attachment: 'mount',
    attachmentAttributes: [{ modtype: 'Stat', mod: 'Soak', value: 1 }],
  });

  expect(await consumers.stat(ctx, 'Soak')).toBe(1);
});

test('an attachment modifier on a ship weapon reaches the vehicle', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'vehicle',
    item: 'shipweapon',
    attachment: 'mount',
    attachmentAttributes: [{ modtype: 'Vehicle Stat', mod: 'Speed', value: 1 }],
    // Speed modifiers are Thresholds, so they add to .max
    actorOverrides: { stats: { speed: { value: 0, max: 0 } } },
  });

  expect(await consumers.stat(ctx, 'Speed')).toBe(1);
});

test('a modifier nested inside an attachment reaches the actor', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'armour',
    equipped: true,
    attachment: 'insert',
    modifier: { name: 'qa melee defence', key: 'Defence-Melee', value: 1 },
    itemOverrides: { soak: { value: 0, adjusted: 0 }, defence: { value: 0, adjusted: 0 } },
  });

  expect(ctx.depth).toBe(3);
  expect(await consumers.stat(ctx, 'Defence-Melee')).toBe(1);
});
