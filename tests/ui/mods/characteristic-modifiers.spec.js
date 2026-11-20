import { test, expect } from '../../support/fixtures';
import * as api from '../../support/api';

/**
 * #2372: with `characteristicDiceMods` on, dice modifiers on a characteristic reach every skill using it.
 */

const weaponFor = (skill) => ({
  actor: 'character',
  item: 'weapon',
  equipped: true,
  itemOverrides: {
    skill: { value: skill },
  },
});

test.beforeEach(async ({ world }) => {
  await world.setSetting('characteristicDiceMods', true);
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
