import { test, expect } from '../../support/fixtures';
import * as api from '../../support/api';

/**
 * #2372: dice modifiers on a characteristic reach every skill using it. `characteristicDiceMods` only
 * decides whether the sheets offer them, so these run with it off.
 */

const weaponFor = (skill) => ({
  actor: 'character',
  item: 'weapon',
  equipped: true,
  itemOverrides: {
    skill: { value: skill },
  },
});

test('#2372 a characteristic setback reaches every skill using that characteristic',
  async ({ world, consumers, page }) => {
    const ctx = await world.build(weaponFor('Melee'));
    await world.addItem(ctx, {
      item: 'gear',
      attributes: [{
        modtype: 'Characteristic Setback',
        mod: 'Brawn',
        value: 1,
      }],
    });

    expect(await consumers.skillModifier(ctx, 'Athletics', 'Setback'), 'another Brawn skill').toBe(1);
    expect(await consumers.skillModifier(ctx, 'Charm', 'Setback'), 'not a Presence skill').toBeNull();

    await api.rollWeapon(page, ctx.actor, ctx.item);

    expect((await api.readLastRollDice(page)).setback, 'the Melee roll carries it').toBe(1);
  });

test('#2372 a characteristic setback stacks with a skill setback', async ({ world, page }) => {
  const ctx = await world.build(weaponFor('Melee'));
  await world.addItem(ctx, {
    item: 'gear',
    attributes: [{
      modtype: 'Characteristic Setback',
      mod: 'Brawn',
      value: 1,
    }],
  });
  await world.addItem(ctx, {
    item: 'gear',
    attributes: [{
      modtype: 'Skill Setback',
      mod: 'Melee',
      value: 1,
    }],
  });

  await api.rollWeapon(page, ctx.actor, ctx.item);

  expect((await api.readLastRollDice(page)).setback, 'one die from each').toBe(2);
});

test('#2372 a characteristic downgrade reaches a skill using that characteristic', async ({ world, page }) => {
  const ctx = await world.build(weaponFor('Gunnery'));
  await world.addItem(ctx, {
    item: 'gear',
    attributes: [{
      modtype: 'Characteristic Add Downgrade',
      mod: 'Agility',
      value: 1,
    }],
  });

  await api.rollWeapon(page, ctx.actor, ctx.item);

  const dice = await api.readLastRollDice(page);
  expect(
    [dice.ability, dice.proficiency],
    'Agility 2 and one rank, downgraded once',
  ).toEqual([2, 0]);
});

test('#2372 a characteristic dice change on an Active Effect reaches the skills',
  async ({ world, consumers, page }) => {
    const ctx = await world.build({ actor: 'character' });

    await api.createActorEffect(page, ctx.actor, 'qa encumbered', [{
      key: 'system.characteristics.Brawn.setback',
      value: '1',
    }]);

    expect(await consumers.skillModifier(ctx, 'Athletics', 'Setback'), 'a Brawn skill').toBe(1);
    expect(await consumers.skillModifier(ctx, 'Charm', 'Setback'), 'not a Presence skill').toBeNull();
  });

test('#2372 the sheet does not offer characteristic dice mods by default', async ({ world, page }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'gear',
    attributes: [{
      modtype: 'Stat',
      mod: 'Strain',
      value: 1,
    }],
  });

  const offered = await api.readModifierTypeOptions(page, ctx.item);

  expect(offered, 'the other types are there').toContain('Skill Add Downgrade');
  expect(offered, 'the characteristic ones are not').not.toContain('Characteristic Setback');
});

test('#2372 a mod already using a characteristic dice type keeps it on the sheet', async ({ world, page }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'gear',
    attributes: [{
      modtype: 'Characteristic Setback',
      mod: 'Brawn',
      value: 1,
    }],
  });

  const offered = await api.readModifierTypeOptions(page, ctx.item);

  expect(offered, 'its own type stays selectable').toContain('Characteristic Setback');
  expect(offered, 'the rest stay hidden').not.toContain('Characteristic Boost');
});
