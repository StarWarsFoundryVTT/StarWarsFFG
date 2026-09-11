import {expect, test} from '../../../support/fixtures';

test.fixme('an attachment on an unequipped item contributes nothing', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'armour',
    equipped: false,
    attachment: 'insert',
    baseMods: [{ modtype: 'Stat', mod: 'Defence-Melee', value: 1 }],
    itemOverrides: { soak: { value: 0, adjusted: 0 }, defence: { value: 0, adjusted: 0 } },
  });

  // FIXME: currently fails since equipped items contribute bonuses until equipped and unequipped
  expect(await consumers.stat(ctx, 'Defence-Melee'), 'defence untouched').toBe(0);
});

test('equipping the item activates its attachment modifiers', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'armour',
    equipped: false,
    attachment: 'insert',
    baseMods: [{ modtype: 'Stat', mod: 'Defence-Melee', value: 1 }],
    itemOverrides: { soak: { value: 0, adjusted: 0 }, defence: { value: 0, adjusted: 0 } },
  });

  await world.equip(ctx, true);
  expect(await consumers.stat(ctx, 'Defence-Melee'), 'defence increased').toBe(0 + 1);
});

test('unequipping the item suspends its attachment modifiers', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'armour',
    equipped: false,
    attachment: 'insert',
    baseMods: [{ modtype: 'Stat', mod: 'Defence-Melee', value: 1 }],
    itemOverrides: { soak: { value: 0, adjusted: 0 }, defence: { value: 0, adjusted: 0 } },
  });

  await world.equip(ctx, true);
  await world.equip(ctx, false);
  expect(await consumers.stat(ctx, 'Defence-Melee'), 'defence buff removed').toBe(0);
});

test('removing an attachment removes its contribution', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'armour',
    equipped: false,
    attachment: 'insert',
    baseMods: [{ modtype: 'Stat', mod: 'Defence-Melee', value: 1 }],
    itemOverrides: { soak: { value: 0, adjusted: 0 }, defence: { value: 0, adjusted: 0 } },
  });

  await world.removeAttachment(ctx);
  expect(await consumers.stat(ctx, 'Defence-Melee'), 'defence buff removed').toBe(0);
});
