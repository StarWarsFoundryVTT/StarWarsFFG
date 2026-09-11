import { test, expect } from '../../../support/fixtures';

/**
 * The same D3 shape, assembled four ways, must reach the actor identically.
 */

test('a nested modifier reaches the actor the same way from every origin', async ({ world, consumers }) => {
  for (const origin of ['sidebar', 'compendium']) {
    const ctx = await world.build({
      actor: 'character',
      item: 'armour',
      equipped: true,
      origin,
      label: origin,
      attachment: {
        name: 'insert',
        modifications: [{ name: 'qa melee defence', key: 'Defence-Melee', value: 1, installed: true }],
      },
      itemOverrides: { soak: { value: 0, adjusted: 0 }, defence: { value: 0, adjusted: 0 } },
    });

    expect(await consumers.stat(ctx, 'Defence-Melee'), `applies from ${origin}`).toBe(1);
  }
});

test('an imported item arrives with its nested modifiers already applying', async ({ world, consumers }) => {
  const item = await world.item({
    item: 'armour',
    origin: 'import',
    attachment: {
      name: 'insert',
      modifications: [{ name: 'qa soak', key: 'Soak', value: 1, installed: true }],
      baseMods: [{ modtype: 'Stat', mod: 'Defence-Melee', value: 1 }],
    },
  });

  const ctx = await world.place(item, { actor: 'character', equipped: true, drag: true });

  // brawn + armor + attachment
  expect(await consumers.stat(ctx, 'Soak'), 'modification applies').toBe(3 + 2 + 1);
  expect(await consumers.stat(ctx, 'Defence-Melee'), 'base mods apply').toBe(1 + 1);
});

test('a compendium item keeps its nested modifiers when dragged to an actor', async ({ world, consumers }) => {
  const item = await world.item({
    item: 'armour',
    origin: 'compendium',
    attachment: {
      name: 'insert',
      modifications: [{ name: 'qa soak', key: 'Soak', value: 1, installed: true }],
      baseMods: [{ modtype: 'Stat', mod: 'Defence-Melee', value: 1 }],
    },
  });

  const ctx = await world.place(item, { actor: 'character', equipped: true, drag: true });

  // brawn + armor + attachment
  expect(await consumers.stat(ctx, 'Soak'), 'modification applies').toBe(3 + 2 + 1);
  expect(await consumers.stat(ctx, 'Defence-Melee'), 'base mods apply').toBe(1 + 1);
});

