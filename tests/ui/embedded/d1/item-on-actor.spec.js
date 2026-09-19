import { test, expect } from '../../../support/fixtures';

/**
 * One item on one actor - the shallowest case, one per carrier type.
 */

// actors - vehicles are at bottom
test('a modifier on armor reaches the actor', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'armour',
    equipped: true,
    attributes: [{ modtype: 'Stat', mod: 'Soak', value: 1 }],
    itemOverrides: { soak: { value: 0, adjusted: 0 } },
  });
  expect(await consumers.stat(ctx, 'Soak'), 'Soak increased by armor').toBe(3 + 1);

  await world.equip(ctx, false);
  expect(await consumers.stat(ctx, 'Soak'), 'Soak decreased by unequipping armor').toBe(3);
});

test('a modifier on weapon reaches the actor', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'weapon',
    equipped: true,
    attributes: [{ modtype: 'Stat', mod: 'Wounds', value: 1 }],
    itemOverrides: { soak: { value: 0, adjusted: 0 } },
  });
  expect(await consumers.stat(ctx, 'Wounds'), 'Wounds increased by weapon').toBe(12 + 1);

  await world.equip(ctx, false);
  expect(await consumers.stat(ctx, 'Wounds'), 'Wounds decreased by unequipping weapon').toBe(12);
});

test('a modifier on gear reaches the actor', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'gear',
    equipped: true,
    attributes: [{ modtype: 'Stat', mod: 'Wounds', value: 1 }],
    itemOverrides: { soak: { value: 0, adjusted: 0 } },
  });
  expect(await consumers.stat(ctx, 'Wounds'), 'Wounds increased by gear').toBe(12 + 1);
  // gear has no unequip (currently)
});

test('a modifier on species reaches the actor', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'species',
    attributes: [{ modtype: 'Stat', mod: 'Soak', value: 1 }],
    itemOverrides: { soak: { value: 0, adjusted: 0 } },
  });
  expect(await consumers.stat(ctx, 'Soak'), 'Soak increased by species mod').toBe(3 + 1);
});

test('a modifier on career reaches the actor', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'career',
    attributes: [{ modtype: 'Stat', mod: 'Wounds', value: 1 }],
    itemOverrides: { soak: { value: 0, adjusted: 0 } },
  });
  expect(await consumers.stat(ctx, 'Wounds'), 'Wounds increased by career').toBe(12 + 1);
});

test('a modifier on talent reaches the actor', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'talent',
    attributes: [{ modtype: 'Stat', mod: 'Wounds', value: 1 }],
    itemOverrides: { soak: { value: 0, adjusted: 0 } },
  });
  expect(await consumers.stat(ctx, 'Wounds'), 'Wounds increased by Talent').toBe(12 + 1);
});

test('a modifier on critical injury reaches the actor', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'criticalinjury',
    attributes: [{ modtype: 'Stat', mod: 'Wounds', value: 1 }],
    itemOverrides: { soak: { value: 0, adjusted: 0 } },
  });
  expect(await consumers.stat(ctx, 'Wounds'), 'Wounds increased by critical injury').toBe(12 + 1);
});

test('a modifier on specialization reaches the actor', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'specialization',
    attributes: [{ modtype: 'Stat', mod: 'Wounds', value: 1 }],
    itemOverrides: { soak: { value: 0, adjusted: 0 } },
  });
  expect(await consumers.stat(ctx, 'Wounds'), 'Wounds increased by specialization').toBe(12 + 1);
});

test('a modifier on forcepower reaches the actor', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'forcepower',
    attributes: [{ modtype: 'Stat', mod: 'Wounds', value: 1 }],
    itemOverrides: { soak: { value: 0, adjusted: 0 } },
  });
  expect(await consumers.stat(ctx, 'Wounds'), 'Wounds increased by career').toBe(12 + 1);
});

test('a modifier on signatureability reaches the actor', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'signatureability',
    attributes: [{ modtype: 'Stat', mod: 'Wounds', value: 1 }],
    itemOverrides: { soak: { value: 0, adjusted: 0 } },
  });
  expect(await consumers.stat(ctx, 'Wounds'), 'Wounds increased by signature ability').toBe(12 + 1);
});

// vehicles
test('a modifier on a shipweapon reaches the vehicle', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'vehicle',
    item: 'shipweapon',
    equipped: true,
    attributes: [{ modtype: 'Vehicle Stat', mod: 'Handling', value: 1 }],
    itemOverrides: { soak: { value: 0, adjusted: 0 } },
  });
  expect(await consumers.stat(ctx, 'Handling'), 'Handling increased by shipweapon').toBe(1 + 1);

  await world.equip(ctx, false);
  expect(await consumers.stat(ctx, 'Handling'), 'Handling decreased by unequipping shipweapon').toBe(1);
});

test('a modifier on a shipattachment reaches the vehicle', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'vehicle',
    item: 'shipattachment',
    equipped: true,
    attributes: [{ modtype: 'Vehicle Stat', mod: 'Handling', value: 1 }],
    itemOverrides: { soak: { value: 0, adjusted: 0 } },
  });
  expect(await consumers.stat(ctx, 'Handling'), 'Handling increased by shipattachment').toBe(1 + 1);
});

test('a modifier on a criticaldamage reaches the vehicle', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'vehicle',
    item: 'criticaldamage',
    equipped: true,
    attributes: [{ modtype: 'Vehicle Stat', mod: 'Handling', value: 1 }],
    itemOverrides: { soak: { value: 0, adjusted: 0 } },
  });
  expect(await consumers.stat(ctx, 'Handling'), 'Handling increased by criticaldamage').toBe(1 + 1);
});
