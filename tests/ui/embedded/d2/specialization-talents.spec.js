import { test, expect } from '../../../support/fixtures';
import * as api from '../../../support/api';
import { skillDicePool } from '../../../support/pages/actor-sheet';

/**
 * Talents inside a specialization - the other nesting family, at the same depth as an attachment.
 */

test('a learned specialization talent grants its skill modifier', async ({ page, world }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'specialization',
    talents: [
      // an unlearned node first, to prove it is skipped rather than merely absent
      { name: 'qa unlearned', islearned: false,
        attributes: [{ modtype: 'Skill Add Despair', mod: 'Cool', value: 3 }] },
      { name: 'qa learned',
        attributes: [{ modtype: 'Skill Boost', mod: 'Perception', value: 3 }] },
    ],
  });

  await api.openSheet(page, ctx.actor);

  expect(
    await skillDicePool(page, ctx.actorName, 'Perception'),
    'from the learned node'
  ).toContain('3 boost');
  expect(
    await skillDicePool(page, ctx.actorName, 'Cool'),
    'unlearned node contributes nothing'
  ).not.toContain('Despair');
});

test('an unlearned talent contributes nothing', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'specialization',
    talents: [
      { name: 'qa unlearned', islearned: false,
        attributes: [{ modtype: 'Skill Add Advantage', mod: 'Perception', value: 3 }] },
    ],
  });

  expect(await consumers.skillModifier(ctx, 'Perception', 'Advantage'), 'Perception unchanged').toBeNull();
});

test('two learned talents in one specialization both apply', async ({ page, world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'specialization',
    talents: [
      // an unlearned node first, to prove it is skipped rather than merely absent
      { name: 'qa learned 1',
        attributes: [{ modtype: 'Skill Boost', mod: 'Cool', value: 3 }] },
      { name: 'qa learned 2',
        attributes: [{ modtype: 'Skill Boost', mod: 'Cool', value: 1 }] },
    ],
  });

  await api.openSheet(page, ctx.actor);

  // tooltip splits out by source, so check for each
  expect(
    await skillDicePool(page, ctx.actorName, 'Cool'),
    'from the learned nodes'
  ).toContain('3 boost');
  expect(
    await skillDicePool(page, ctx.actorName, 'Cool'),
    'from the learned nodes'
  ).toContain('1 boost');
});

test('the same talent in two specializations applies twice', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'specialization',
    talents: [
      { name: 'qa shared',
        attributes: [{ modtype: 'Skill Boost', mod: 'Cool', value: 1 }] },
    ],
  });

  // a second specialization on the same actor, carrying the same talent
  await world.addItem(ctx, {
    item: 'specialization',
    talents: [
      { name: 'qa shared',
        attributes: [{ modtype: 'Skill Boost', mod: 'Cool', value: 1 }] },
    ],
  });

  expect(await consumers.skillModifier(ctx, 'Cool', 'Boost'), 'one from each specialization').toBe(2);
});

test('a ranked talent applies once per rank', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'specialization',
    talents: [
      { name: 'qa ranked', isRanked: true,
        attributes: [{ modtype: 'Skill Boost', mod: 'Cool', value: 1 }] },
      { name: 'qa ranked', isRanked: true,
        attributes: [{ modtype: 'Skill Boost', mod: 'Cool', value: 1 }] },
    ],
  });

  expect(await consumers.skillModifier(ctx, 'Cool', 'Boost'), 'one boost per rank').toBe(2);
});

test('removing a talent from a specialization removes its contribution', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'specialization',
    talents: [
      { name: 'qa kept',
        attributes: [{ modtype: 'Skill Boost', mod: 'Cool', value: 1 }] },
      { name: 'qa removed',
        attributes: [{ modtype: 'Skill Boost', mod: 'Perception', value: 1 }] },
    ],
  });

  expect(await consumers.skillModifier(ctx, 'Perception', 'Boost'), 'while the talent is there').toBe(1);

  await world.clearTalent(ctx, 1);

  expect(await consumers.skillModifier(ctx, 'Perception', 'Boost'), 'once it is gone').toBeNull();
  expect(await consumers.skillModifier(ctx, 'Cool', 'Boost'), 'the other talent is untouched').toBe(1);
});

test('#1811 the ranked flag survives being dropped into a specialization', async ({ page, world }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'specialization',
  });

  // dropped onto the tree's own empty node, the way a player adds a talent to a specialization
  await world.dropTalent(ctx, 'talent0', { name: 'qa ranked talent', ranked: true });

  expect(
    await api.read(page, ctx.item, 'system.talents.talent0.name'),
    'the talent landed on the node'
  ).toContain('qa ranked talent');
  expect(
    await api.read(page, ctx.item, 'system.talents.talent0.isRanked'),
    'ranked survives the drop'
  ).toBe(true);
});

test('#2263 dropping the same talent twice replaces the node rather than stacking it', async ({ page, world }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'specialization',
  });

  const source = await world.dropTalent(ctx, 'talent0', {
    name: 'qa restacked',
    attributes: [{ modtype: 'Skill Boost', mod: 'Cool', value: 1 }],
  });
  const sourceAfterFirstDrop = await api.readModifierEffects(page, source);

  await api.dropTalentOntoSpecialization(page, ctx.item, source, 'talent0');

  expect(
    Object.keys(await api.read(page, ctx.item, 'system.talents.talent0.attributes') ?? {}),
    'the node carries one modifier, not one per drop'
  ).toHaveLength(1);
  const nodeEffects = (
    await api.readModifierEffects(page, ctx.item)
  ).effects.filter((effect) => effect.name.startsWith('attr'));
  expect(nodeEffects, 'and one active effect to go with it').toHaveLength(1);
  expect(
    await api.readModifierEffects(page, source),
    'the talent that was dragged is left alone'
  ).toEqual(sourceAfterFirstDrop);
});
