import { test, expect } from '../../../support/fixtures';

/**
 * What happens to a D3 modifier when something above it changes.
 */

test('a nested modifier on an unequipped item contributes nothing', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'armour',
    equipped: false,
    attachment: {
      name: 'insert',
      modifications: [{ name: 'qa melee defence', key: 'Defence-Melee', value: 1, installed: true }],
    },
    itemOverrides: { soak: { value: 0, adjusted: 0 }, defence: { value: 0, adjusted: 0 } },
  });

  expect(await consumers.stat(ctx, 'Defence-Melee'), 'carried, not worn').toBe(0);
});

test('equipping the carrier activates its nested modifiers', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'armour',
    equipped: false,
    attachment: {
      name: 'insert',
      modifications: [{ name: 'qa melee defence', key: 'Defence-Melee', value: 1, installed: true }],
    },
    itemOverrides: { soak: { value: 0, adjusted: 0 }, defence: { value: 0, adjusted: 0 } },
  });

  await world.equip(ctx, true);

  expect(await consumers.stat(ctx, 'Defence-Melee'), 'contributes after equipping').toBe(1);
});

test('unequipping the carrier suspends its nested modifiers', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'armour',
    equipped: true,
    attachment: {
      name: 'insert',
      modifications: [{ name: 'qa melee defence', key: 'Defence-Melee', value: 1, installed: true }],
    },
    itemOverrides: { soak: { value: 0, adjusted: 0 }, defence: { value: 0, adjusted: 0 } },
  });

  await world.equip(ctx, false);

  expect(await consumers.stat(ctx, 'Defence-Melee'), 'does not contribute after unequipping').toBe(0);
});

test('removing the attachment removes its nested modifier contribution', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'armour',
    equipped: true,
    attachment: {
      name: 'insert',
      modifications: [{ name: 'qa melee defence', key: 'Defence-Melee', value: 1, installed: true }],
    },
    itemOverrides: { soak: { value: 0, adjusted: 0 }, defence: { value: 0, adjusted: 0 } },
  });

  await world.removeAttachment(ctx);

  expect(await consumers.stat(ctx, 'Defence-Melee'), 'does not contribute after unequipping').toBe(0);
});

test('removing one nested modifier leaves the others applying', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'armour',
    equipped: true,
    attachment: {
      name: 'insert',
      modifications: [{ name: 'qa melee defence', key: 'Defence-Melee', value: 1, installed: true }],
    },
    itemOverrides: { soak: { value: 0, adjusted: 0 }, defence: { value: 0, adjusted: 0 } },
  });
  await world.addModifier(ctx, { name: 'qa melee defence 2', key: 'Defence-Melee', value: 1, active: true });

  await world.removeModifier(ctx);

  expect(await consumers.stat(ctx, 'Defence-Melee'), 'does not contribute after unequipping').toBe(1);
});

test('adding a modifier to an already-attached attachment applies it', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'armour',
    equipped: true,
    attachment: {
      name: 'insert',
      modifications: [{ name: 'qa melee defence', key: 'Defence-Melee', value: 1, installed: true }],
    },
    itemOverrides: { soak: { value: 0, adjusted: 0 }, defence: { value: 0, adjusted: 0 } },
  });
  await world.addModifier(ctx, { name: 'qa melee defence 2', key: 'Defence-Melee', value: 1, active: true });

  expect(await consumers.stat(ctx, 'Defence-Melee'), 'does not contribute after unequipping').toBe(2);
});

// An attachment holding both kinds at once - the lifecycle has to move them together.
test('unequipping the carrier suspends its Base Mods and its Modifications alike', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'armour',
    equipped: true,
    attachment: {
      name: 'insert',
      baseMods: [{ modtype: 'Stat', mod: 'Soak', value: 1 }],
      modifications: [{ name: 'qa melee defence', key: 'Defence-Melee', value: 1, installed: true }],
    },
    itemOverrides: { soak: { value: 0, adjusted: 0 }, defence: { value: 0, adjusted: 0 } },
  });

  await world.equip(ctx, false);

  expect(await consumers.stat(ctx, 'Soak'), 'the Base Mod is suspended').toBe(3);
  expect(await consumers.stat(ctx, 'Defence-Melee'), 'and the Modification with it').toBe(0);
});

test('removing an attachment removes both its Base Mods and its Modifications', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'armour',
    equipped: true,
    attachment: {
      name: 'insert',
      baseMods: [{ modtype: 'Stat', mod: 'Soak', value: 1 }],
      modifications: [{ name: 'qa melee defence', key: 'Defence-Melee', value: 1, installed: true }],
    },
    itemOverrides: { soak: { value: 0, adjusted: 0 }, defence: { value: 0, adjusted: 0 } },
  });

  await world.removeAttachment(ctx);

  expect(await consumers.stat(ctx, 'Soak'), 'the Base Mod goes with the attachment').toBe(3);
  expect(await consumers.stat(ctx, 'Defence-Melee'), 'and so does the Modification').toBe(0);
});
