import { test, expect } from '../../support/fixtures';

/**
 * The pool a roll is built from, before any dice are thrown.
 */

test('a skill roll uses the higher of characteristic and rank for ability dice', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    actorOverrides: {
      skills: {
        'Cool': { rank: 3 },
      },
    },
  });

  const gunnery = await consumers.skillPool(ctx, 'Gunnery');
  const cool = await consumers.skillPool(ctx, 'Cool');

  expect(gunnery.ability + gunnery.proficiency, 'as many dice as the higher of the two').toBe(2);
  expect(gunnery.proficiency, 'upgraded as far as the lower').toBe(1);
  expect(cool.ability + cool.proficiency, 'and the same when the rank is the higher').toBe(3);
  expect(cool.proficiency, 'still upgraded by the lower').toBe(1);
});

test('a skill roll upgrades ability to proficiency once per matching rank', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    actorOverrides: {
      skills: {
        'Coercion': { rank: 3 },
      },
    },
  });

  const untrained = await consumers.skillPool(ctx, 'Discipline');
  const trained = await consumers.skillPool(ctx, 'Vigilance');
  const mastered = await consumers.skillPool(ctx, 'Coercion');

  expect([untrained.ability, untrained.proficiency], 'no ranks, no upgrades').toEqual([3, 0]);
  expect([trained.ability, trained.proficiency], 'two ranks, two dice upgraded').toEqual([1, 2]);
  expect([mastered.ability, mastered.proficiency], 'and a rank for every die').toEqual([0, 3]);
});

test('a weapon quality adding boost shows in the pool', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'weapon',
    equipped: true,
    attributes: [{
      modtype: 'Roll Modifiers',
      mod: 'Add Boost',
      value: 1,
    }],
  });

  expect(await consumers.poolDice(ctx), 'a boost die and nothing else').toEqual({
    ability: 0, proficiency: 0, boost: 1,
    setback: 0, remsetback: 0, difficulty: 0, challenge: 0, force: 0,
  });
});

test('a weapon quality adding setback shows in the pool', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'weapon',
    equipped: true,
    attributes: [{
      modtype: 'Roll Modifiers',
      mod: 'Add Setback',
      value: 1,
    }],
  });

  expect(await consumers.poolDice(ctx), 'a setback die and nothing else').toEqual({
    ability: 0, proficiency: 0, boost: 0,
    setback: 1, remsetback: 0, difficulty: 0, challenge: 0, force: 0,
  });
});

test('Remove Setback cancels a setback die rather than adding one', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'weapon',
    equipped: true,
    attributes: [
      {
        modtype: 'Roll Modifiers',
        mod: 'Add Setback',
        value: 2,
      },
      {
        modtype: 'Roll Modifiers',
        mod: 'Remove Setback',
        value: 1,
      },
    ],
  });

  expect(await consumers.poolDice(ctx), 'two setback dice and one removal').toEqual({
    ability: 0, proficiency: 0, boost: 0,
    setback: 2, remsetback: 1, difficulty: 0, challenge: 0, force: 0,
  });
});

test('Upgrade Difficulty turns a difficulty die into a challenge die', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'weapon',
    equipped: true,
    attributes: [
      {
        modtype: 'Dice Modifiers',
        mod: 'Add Difficulty',
        value: 1,
      },
      {
        modtype: 'Dice Modifiers',
        mod: 'Upgrade Difficulty',
        value: 1,
      },
    ],
  });

  expect(await consumers.poolDice(ctx), 'the die is promoted, not joined by another').toEqual({
    ability: 0, proficiency: 0, boost: 0,
    setback: 0, remsetback: 0, difficulty: 0, challenge: 1, force: 0,
  });
});

test('Downgrade Difficulty turns a challenge die back into a difficulty die', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'weapon',
    equipped: true,
    attributes: [
      {
        modtype: 'Dice Modifiers',
        mod: 'Add Difficulty',
        value: 1,
      },
      {
        modtype: 'Dice Modifiers',
        mod: 'Upgrade Difficulty',
        value: 1,
      },
      {
        modtype: 'Dice Modifiers',
        mod: 'Downgrade Difficulty',
        value: 1,
      },
    ],
  });

  expect(await consumers.poolDice(ctx), 'the die comes back rather than going away').toEqual({
    ability: 0, proficiency: 0, boost: 0,
    setback: 0, remsetback: 0, difficulty: 1, challenge: 0, force: 0,
  });
});

test('Upgrade Ability turns an ability die into a proficiency die', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'weapon',
    equipped: true,
    itemOverrides: {
      skill: { value: 'Gunnery' },
    },
    attributes: [{
      modtype: 'Dice Modifiers',
      mod: 'Upgrade Ability',
      value: 1,
    }],
  });

  expect(await consumers.weaponPool(ctx), 'one die promoted, none added').toEqual({
    ability: 0, proficiency: 2, boost: 0,
    setback: 0, remsetback: 0, difficulty: 0, challenge: 0, force: 0,
  });
});

test('a force power adds force dice to the pool', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'forcepower',
    attributes: [{
      modtype: 'Stat',
      mod: 'ForcePool',
      value: 1,
    }],
  });

  // the character has no force rating of its own, so every die here came from the power
  expect(await consumers.stat(ctx, 'ForcePool'), 'the power gives a force rating').toBe(1);
  expect(await consumers.forceDice(ctx), 'and an unspent die to roll with it').toBe(1);
});

test('an unequipped weapon contributes nothing to the pool', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'weapon',
    equipped: true,
    attributes: [{
      modtype: 'Skill Boost',
      mod: 'Gunnery',
      value: 1,
    }],
  });

  expect((await consumers.skillPool(ctx, 'Gunnery')).boost, 'worn, it boosts the skill').toBe(1);

  await world.equip(ctx, false);

  expect((await consumers.skillPool(ctx, 'Gunnery')).boost, 'stowed, it does not').toBe(0);
});

test('two sources of boost dice both count', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'weapon',
    equipped: true,
    itemOverrides: {
      skill: { value: 'Gunnery' },
    },
    attributes: [{
      modtype: 'Roll Modifiers',
      mod: 'Add Boost',
      value: 1,
    }],
  });

  await world.addItem(ctx, {
    item: 'armour',
    equipped: true,
    attributes: [{
      modtype: 'Skill Boost',
      mod: 'Gunnery',
      value: 1,
    }],
  });

  expect(await consumers.weaponPool(ctx), 'both boosts, and the skill dice under them').toEqual({
    ability: 1, proficiency: 1, boost: 2,
    setback: 0, remsetback: 0, difficulty: 0, challenge: 0, force: 0,
  });
});

// open bugs at the time of writing
test.fixme('#2198 a force power granting Force dice adds one, not two', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'forcepower',
    attributes: [{
      modtype: 'Force Boost',
      mod: 'Athletics',
      value: 1,
    }],
  });

  // FIXME: #2198
  expect(await consumers.skillModifier(ctx, 'Athletics', 'Force'), 'one rank, one die').toBe(1);
  expect((await consumers.skillPool(ctx, 'Athletics')).force, 'and one in the pool').toBe(1);
});

test.fixme('#2198 every die in the pool names a source that can be found', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'forcepower',
    attributes: [{
      modtype: 'Force Boost',
      mod: 'Athletics',
      value: 1,
    }],
  });

  const dice = await consumers.skillModifier(ctx, 'Athletics', 'Force');
  const sources = await consumers.skillSources(ctx, 'Athletics', 'Force');
  const accounted = sources.reduce((total, source) => total + source.value, 0);

  // FIXME: #2198
  expect(accounted, 'every die is accounted for by something the sheet can show').toBe(dice);
  expect(sources.map((source) => source.type), 'and it is the power that granted it')
    .toEqual([ctx.itemName]);
});

test.fixme('#2201 an imported species modifier appears in the pool with its source named', async ({ world, consumers }) => {
  const species = await world.imported('species', 'CHADRA');
  const ctx = await world.place(species, { actor: 'character' });

  const removed = await consumers.skillModifier(ctx, 'Perception', 'Remove Setback');
  const sources = await consumers.skillSources(ctx, 'Perception', 'Remove Setback');

  // FIXME: #2201
  expect(removed, 'the two setbacks the species removes').toBe(2);
  expect(sources, 'from one place, which the sheet can name').toHaveLength(1);
  expect(sources[0].type, 'and that place is the species').toBe(ctx.itemName);
});

test.fixme('#2073 a force rating from a specialization matches one from a talent', async ({ world, consumers }) => {
  const rating = {
    modtype: 'Stat',
    mod: 'ForcePool',
    value: 1,
  };

  const fromSpecialization = await world.build({
    actor: 'character',
    item: 'specialization',
    attributes: [rating],
  });
  const fromTalent = await world.build({
    actor: 'character',
    item: 'talent',
    attributes: [rating],
  });

  // FIXME: #2073
  expect(await consumers.stat(fromTalent, 'ForcePool'), 'one rating from the talent').toBe(1);
  expect(
    await consumers.stat(fromSpecialization, 'ForcePool'),
    'and the same from the specialization'
  ).toBe(1);
});
