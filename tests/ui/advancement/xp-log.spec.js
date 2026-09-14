import { test, expect } from '../../support/fixtures';

/**
 * The ledger of what was earned and spent.
 */

test('a purchase appends a spend entry naming what was bought', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'specialization',
    talents: [
      {
        name: 'qa bought talent',
        islearned: false,
        attributes: [{
          modtype: 'Stat',
          mod: 'Wounds',
          value: 1,
        }],
      },
    ],
  });

  await world.buy(ctx, 0);

  const log = await consumers.xpLog(ctx);
  expect(log, 'one purchase, one entry').toHaveLength(1);
  expect(log[0].action, 'logged as a purchase').toBe('purchased');
  expect(log[0].description, 'names the talent').toContain('qa bought talent');
  expect(log[0].cost, 'a talent in the first row of the tree costs 5').toBe(5);
  expect(log[0].available, 'the balance it left behind').toBe(100 - 5);
  expect(log[0].total, 'total XP is unchanged').toBe(250);
});

test('adding a species logs the starting XP it granted', async ({ world, consumers }) => {
  const species = await world.item({
    item: 'species',
  });
  const ctx = await world.place(species, { actor: 'character', drag: true });

  const log = await consumers.xpLog(ctx);
  expect(log, 'one grant, one entry').toHaveLength(1);
  expect(log[0].action, 'logged as a grant').toBe('granted');
  expect(log[0].description, 'names the species').toContain('received species');
  expect(log[0].cost, 'the species starting XP').toBe(100);
  expect(log[0].available, 'added to what the character had').toBe(100 + 100);
  expect(log[0].total, 'and to the lifetime total').toBe(250 + 100);
});

test('the running balance in the log matches available XP', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'specialization',
    talents: [
      {
        name: 'qa bought talent',
        islearned: false,
        attributes: [{
          modtype: 'Stat',
          mod: 'Wounds',
          value: 1,
        }],
      },
    ],
    actorOverrides: { skills: { 'Gunnery': { rank: 1, careerskill: true } } },
  });

  await world.buy(ctx, 0);
  await world.buySkill(ctx, 'Gunnery');

  const xp = await consumers.xp(ctx);
  const log = await consumers.xpLog(ctx);
  expect(log, 'one entry per purchase').toHaveLength(2);
  expect(log[0].available, 'the newest entry is the current balance').toBe(xp.available);
  expect(log[1].available, 'the one before it is the balance after the talent').toBe(100 - 5);
});

test('a refused purchase logs nothing', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'specialization',
    talents: [
      {
        name: 'qa bought talent',
        islearned: false,
        attributes: [{
          modtype: 'Stat',
          mod: 'Wounds',
          value: 1,
        }],
      },
    ],
    actorOverrides: { experience: { available: 0, total: 250 } },
  });

  await world.buy(ctx, 0);

  const log = await consumers.xpLog(ctx);
  expect(log, 'nothing bought, nothing recorded').toHaveLength(0);
});
