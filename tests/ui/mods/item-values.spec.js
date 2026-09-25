import { test, expect } from '../../support/fixtures';
import * as api from '../../support/api';
import { ITEMS, attributeMap } from '../../fixtures/documents';

let seq = 0;

/** An item in the sidebar, owned by nobody, carrying modifiers of its own. */
async function sidebarItem(world, type, attributes, overrides = {}) {
  const uuid = world.track(await api.createItem(world.page, {
    type,
    name: `qa-${type}-${seq++}`,
    system: {
      ...ITEMS[type].system,
      ...overrides,
      attributes: attributeMap(attributes),
    },
  }));
  await api.waitForInherentEffect(world.page, uuid);
  return uuid;
}

test('the reported case: armor with no soak and a soak modifier shows 1', async ({ world }) => {
  const armour = await sidebarItem(
    world,
    'armour',
    [{ modtype: 'Armor Stat', mod: 'soak', value: 1 }],
    { soak: { value: 0, adjusted: 0 } },
  );

  expect(await api.read(world.page, armour, 'system.soak.adjusted'), 'soak 0 + 1').toBe(1);
});

// base values are the fixtures', which mirror ARMROBE and BLASTPIS
const CASES = [
  { item: 'armour', modtype: 'Armor Stat', mod: 'soak',        path: 'soak',        base: 2,    value: 1 },
  { item: 'armour', modtype: 'Stat',       mod: 'Soak',        path: 'soak',        base: 2,    value: 1 },
  { item: 'armour', modtype: 'Armor Stat', mod: 'defence',     path: 'defence',     base: 1,    value: 1 },
  { item: 'armour', modtype: 'Armor Stat', mod: 'encumbrance', path: 'encumbrance', base: 5,    value: 2 },
  { item: 'armour', modtype: 'Armor Stat', mod: 'hardpoints',  path: 'hardpoints',  base: 2,    value: 1 },
  { item: 'armour', modtype: 'Armor Stat', mod: 'price',       path: 'price',       base: 4500, value: 100 },
  { item: 'armour', modtype: 'Armor Stat', mod: 'rarity',      path: 'rarity',      base: 8,    value: 1 },
  { item: 'weapon', modtype: 'Weapon Stat', mod: 'damage',      path: 'damage',      base: 6,   value: 2 },
  { item: 'weapon', modtype: 'Weapon Stat', mod: 'critical',    path: 'crit',        base: 3,   value: -1 },
  { item: 'weapon', modtype: 'Weapon Stat', mod: 'encumbrance', path: 'encumbrance', base: 1,   value: 1 },
  { item: 'weapon', modtype: 'Weapon Stat', mod: 'hardpoints',  path: 'hardpoints',  base: 3,   value: 1 },
  { item: 'weapon', modtype: 'Weapon Stat', mod: 'price',       path: 'price',       base: 400, value: 50 },
  { item: 'weapon', modtype: 'Weapon Stat', mod: 'rarity',      path: 'rarity',      base: 4,   value: 1 },
];

for (const c of CASES) {
  test(`${c.modtype} ${c.mod} ${c.value} adjusts ${c.item} ${c.path}`, async ({ world }) => {
    const item = await sidebarItem(world, c.item, [
      { modtype: c.modtype, mod: c.mod, value: c.value },
    ]);

    expect(
      await api.read(world.page, item, `system.${c.path}.adjusted`),
      `${c.path} ${c.base} + ${c.value}`,
    ).toBe(c.base + c.value);
  });
}

test('a hardpoint modifier raises what is left to spend', async ({ world }) => {
  const armour = await sidebarItem(world, 'armour', [
    { modtype: 'Armor Stat', mod: 'hardpoints', value: 1 },
  ]);

  expect(
    await api.read(world.page, armour, 'system.hardpoints.current'),
    'nothing is fitted, so the whole raised budget is free',
  ).toBe(2 + 1);
});

test('a range modifier walks the band up', async ({ world }) => {
  const weapon = await sidebarItem(world, 'weapon', [
    { modtype: 'Weapon Stat', mod: 'range', value: 1 },
  ]);

  expect(await api.read(world.page, weapon, 'system.range.adjusted'), 'Medium + 1').toBe('Long');
});

test('a modifier on an item on an actor still counts once', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'armour',
    equipped: true,
    attributes: [{ modtype: 'Armor Stat', mod: 'soak', value: 1 }],
    itemOverrides: { soak: { value: 0, adjusted: 0 } },
  });

  expect(await consumers.itemAdjusted(ctx, 'Soak'), 'soak 0 + 1').toBe(1);
});
