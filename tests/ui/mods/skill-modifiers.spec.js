import { test, expect } from '../../support/fixtures';

/**
 * A modifier on an item reaches the actor's skills once the item is on the actor.
 */

const CASES = [
  { item: 'career',         modtype: 'Skill Add Advantage', skill: 'Gunnery',    kind: 'Advantage', value: 1 },
  { item: 'criticalinjury', modtype: 'Skill Add Success',   skill: 'Melee',      kind: 'Success',   value: 2 },
  { item: 'gear',           modtype: 'Skill Add Advantage', skill: 'Charm',      kind: 'Advantage', value: 2 },
];

for (const c of CASES) {
  test(`${c.item} grants ${c.kind} ${c.value} on ${c.skill}`, async ({ world, consumers }) => {
    const ctx = await world.build({
      actor: 'character',
      item: c.item,
      attributes: [{ modtype: c.modtype, mod: c.skill, value: c.value }],
    });

    expect(await consumers.skillModifier(ctx, c.skill, c.kind)).toBe(c.value);
  });
}

test('a talent modifier reaches an actor stat', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'talent',
    attributes: [{ modtype: 'Stat', mod: 'Strain', value: 3 }],
  });

  expect(await consumers.stat(ctx, 'Strain')).toBe(13 + 3);
});
