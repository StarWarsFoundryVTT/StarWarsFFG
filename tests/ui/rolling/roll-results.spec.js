import { test, expect } from '../../support/fixtures';
import * as api from '../../support/api';

/**
 * What a roll produces once it has been thrown, and what the chat card says about it.
 */

test('successes and failures cancel to a net result', async ({ page }) => {
  const rolled = await api.rollDice(page, [
    // two successes, against one failure and one threat
    { type: 'ability', face: 4 },
    { type: 'difficulty', face: 2 },
    { type: 'difficulty', face: 4 },
  ]);

  expect(rolled.success, 'two successes less the one failure').toBe(1);
  expect(rolled.failure, 'and nothing left on the other side').toBe(0);
  expect(rolled.threat, 'the threat is untouched by any of it').toBe(1);
});

test('advantage and threat cancel to a net result', async ({ page }) => {
  const rolled = await api.rollDice(page, [
    { type: 'boost', face: 5 },
    { type: 'ability', face: 2 },
    { type: 'difficulty', face: 4 },
  ]);

  expect(rolled.advantage, 'two advantage less the one threat').toBe(1);
  expect(rolled.threat, 'and nothing left on the other side').toBe(0);
  expect(rolled.success, 'the success is untouched by any of it').toBe(1);
});

test('triumph counts as a success and survives cancellation', async ({ page }) => {
  const rolled = await api.rollDice(page, [
    { type: 'proficiency', face: 12 },
    { type: 'difficulty', face: 2 },
  ]);

  expect(rolled.success, 'the success it carries meets the failure').toBe(0);
  expect(rolled.failure, 'which spends them both').toBe(0);
  expect(rolled.triumph, 'and the triumph is not something failures can cancel').toBe(1);
});

test('despair counts as a failure and survives cancellation', async ({ page }) => {
  const rolled = await api.rollDice(page, [
    { type: 'challenge', face: 12 },
    { type: 'ability', face: 2 },
  ]);

  expect(rolled.failure, 'the failure it carries meets the success').toBe(0);
  expect(rolled.success, 'which spends them both').toBe(0);
  expect(rolled.despair, 'and the despair is not something successes can cancel').toBe(1);
});

test('a weapon roll card names the qualities that applied', async ({ world, page }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'weapon',
    equipped: true,
    modifier: {
      name: 'qa pierce',
      key: 'Add Boost',
      modtype: 'Roll Modifiers',
      value: 1,
      active: true,
    },
  });

  await api.rollWeapon(page, ctx.actor, ctx.item);

  expect(await api.readCardQualities(page), 'the quality is named on the card').toContain('qa pierce');
});

test('a weapon roll card shows damage including its modifiers', async ({ world, page, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'weapon',
    equipped: true,
    modifier: {
      name: 'qa sharpened',
      key: 'damage',
      modtype: 'Weapon Stat',
      value: 1,
      active: true,
    },
  });

  expect(await consumers.itemAdjusted(ctx, 'Damage'), 'the weapon hits for one more').toBe(6 + 1);

  await api.submitSheet(page, ctx.item);

  await api.rollWeapon(page, ctx.actor, ctx.item, {
    faces: { proficiency: 4, difficulty: 1 },
  });

  const printed = await api.readCardDamage(page);

  expect(printed, 'the card has a damage line').toBeTruthy();
  expect(printed.split(' + ')[0], `the card counts the modifier in, printing "${printed}"`).toBe('7');
});

test('the roll dialog lets a player add dice before rolling', async ({ world, page }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'weapon',
    equipped: true,
  });

  await api.rollWeapon(page, ctx.actor, ctx.item, {
    add: { boost: 1 },
  });

  expect(await api.readLastRollDice(page), 'the die the player added was rolled too').toEqual({
    ability: 0, proficiency: 2, boost: 1,
    setback: 0, difficulty: 2, challenge: 0, force: 0,
  });
});

test('force dice report light and dark pips separately', async ({ page }) => {
  const rolled = await api.rollDice(page, [
    { type: 'force', face: 7 },
    { type: 'force', face: 10 },
  ]);

  expect(rolled.dark, 'two dark pips').toBe(2);
  expect(rolled.light, 'and two light, neither taken off the other').toBe(2);
  expect(rolled.success, 'and no successes come of any of it').toBe(0);
});
