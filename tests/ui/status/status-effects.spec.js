import { test, expect } from '../../support/fixtures';
import * as api from '../../support/api';

/**
 * The statuses a token can be marked with, and what they do while they are on.
 */

test('the system offers its own statuses in place of the core ones', async ({ page }) => {
  const statuses = await api.readStatusEffects(page);
  const ids = statuses.map((status) => status.id);

  expect(ids.filter((id) => !id.startsWith('starwarsffg-')), 'nothing from anywhere else').toEqual([]);
  expect(ids, 'the marker the combat tracker reads').toContain('starwarsffg-defeated');
  expect(ids, 'the condition that costs dice').toContain('starwarsffg-disoriented');
  expect(ids, 'and the cover a GM reaches for most').toContain('starwarsffg-heavy-cover');
});

test('marking a token with a status puts the effect on its actor', async ({ world, page, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
  });
  const statuses = await api.readStatusEffects(page);
  const cover = statuses.find((status) => status.id === 'starwarsffg-heavy-cover');

  expect(await consumers.stat(ctx, 'Defence-Melee'), 'nothing to hide behind yet').toBe(0);

  await api.toggleStatus(page, ctx.actor, cover.id);

  const effects = await api.readEffects(page, ctx.actor);

  expect(effects.map((effect) => effect.name), 'the status is on the actor').toContain(cover.name);
  expect(effects.filter((effect) => effect.disabled), 'switched on, not merely present').toEqual([]);
  expect(await consumers.stat(ctx, 'Defence-Melee'), 'and its changes are being felt').toBe(2);
});

test('clearing the status takes the effect off again', async ({ world, page, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
  });
  const statuses = await api.readStatusEffects(page);
  const cover = statuses.find((status) => status.id === 'starwarsffg-heavy-cover');

  await api.toggleStatus(page, ctx.actor, cover.id, true);

  expect(await consumers.stat(ctx, 'Defence-Melee'), 'behind cover').toBe(2);

  await api.toggleStatus(page, ctx.actor, cover.id, false);

  const effects = await api.readEffects(page, ctx.actor);

  expect(effects.map((effect) => effect.name), 'the status is off the actor').not.toContain(cover.name);
  expect(await consumers.stat(ctx, 'Defence-Melee'), 'and it is out in the open again').toBe(0);
});

test('heavy cover raises defence against both melee and ranged', async ({ world, page, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
  });
  const defence = async () => [
    await consumers.stat(ctx, 'Defence-Melee'),
    await consumers.stat(ctx, 'Defence-Ranged'),
  ];

  expect(await defence(), 'no defence of its own').toEqual([0, 0]);

  await api.toggleStatus(page, ctx.actor, 'starwarsffg-heavy-cover', true);

  expect(await defence(), 'two of each while the cover holds').toEqual([2, 2]);
});

test('disoriented adds a setback die to every skill', async ({ world, page, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
  });

  const setbacks = async () => {
    const skills = await api.read(page, ctx.actor, 'system.skills');
    return Object.entries(skills ?? {})
      .map(([name, skill]) => [name, Number(skill?.setback ?? 0)]);
  };

  const before = await setbacks();

  expect(before.length, 'the actor has skills to be disoriented about').toBeGreaterThan(0);
  expect(before.filter(([, setback]) => setback !== 0).map(([name]) => name), 'clear-headed').toEqual([]);

  await api.toggleStatus(page, ctx.actor, 'starwarsffg-disoriented', true);

  const missed = (await setbacks()).filter(([, setback]) => setback !== 1).map(([name]) => name);

  expect(missed, 'a setback on every last one').toEqual([]);
  expect((await consumers.skillPool(ctx, 'Gunnery')).setback, 'and the pool feels it').toBe(1);
});

test('a boost status adds a boost die to the pool it was meant for', async ({ world, page, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
  });

  expect((await consumers.skillPool(ctx, 'Gunnery')).boost, 'nothing extra to start').toBe(0);

  await api.toggleStatus(page, ctx.actor, 'starwarsffg-boost-once', true);

  expect((await consumers.skillPool(ctx, 'Gunnery')).boost, 'the next check gets it').toBe(1);
  expect((await consumers.skillPool(ctx, 'Vigilance')).boost, 'whichever check that is').toBe(1);
});

test('two statuses at once both apply', async ({ world, page, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
  });

  await api.toggleStatus(page, ctx.actor, 'starwarsffg-heavy-cover', true);
  await api.toggleStatus(page, ctx.actor, 'starwarsffg-disoriented', true);
  
  expect(await consumers.stat(ctx, 'Defence-Melee'), 'the cover counts').toBe(2);
  expect((await consumers.skillPool(ctx, 'Gunnery')).setback, 'and so does the disorientation').toBe(1);
  expect(await api.readEffects(page, ctx.actor), 'both are on the actor').toHaveLength(2);
});

test('immobilized carries no changes of its own', async ({ world, page, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
  });
  const statuses = await api.readStatusEffects(page);
  const immobilized = statuses.find((status) => status.id === 'starwarsffg-immobilized');
  const reading = async () => ({
    defence: await consumers.stat(ctx, 'Defence-Melee'),
    soak: await consumers.stat(ctx, 'Soak'),
    setback: (await consumers.skillPool(ctx, 'Gunnery')).setback,
  });

  expect(immobilized.changes, 'a marker rather than a modifier').toBe(0);

  const before = await reading();

  await api.toggleStatus(page, ctx.actor, immobilized.id, true);

  expect(await reading(), 'nothing about the character changes').toEqual(before);
  expect(
    (await api.readEffects(page, ctx.actor)).map((effect) => effect.name),
    'but it is on the actor to be seen'
  ).toContain(immobilized.name);
});

// Statuses that clean themselves up, and the two events that are meant to do it.

test('a status that lasts for one check is gone after the roll', async ({ world, page, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'weapon',
    equipped: true,
  });
  const statuses = await api.readStatusEffects(page);
  const boost = statuses.find((status) => status.id === 'starwarsffg-boost-once');

  expect(boost.duration, 'a status that lasts one check').toBe('once');

  await api.toggleStatus(page, ctx.actor, boost.id, true);

  expect((await consumers.skillPool(ctx, 'Ranged: Light')).boost, 'the die is waiting').toBe(1);

  await api.rollWeapon(page, ctx.actor, ctx.item);

  await expect.poll(
    () => consumers.skillPool(ctx, 'Ranged: Light').then((pool) => pool.boost),
    { message: 'and the die was spent on it' }
  ).toBe(0);

  const effects = await api.readEffects(page, ctx.actor);

  expect(effects.map((effect) => effect.name), 'the status went with it').not.toContain(boost.name);
});

test('a status that lasts for the combat survives a roll', async ({ world, page, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'weapon',
    equipped: true,
  });
  const statuses = await api.readStatusEffects(page);
  const boost = statuses.find((status) => status.id === 'starwarsffg-boost-combat');

  expect(boost.duration, 'a status that lasts the encounter').toBe('combat');

  await api.toggleStatus(page, ctx.actor, boost.id, true);
  await api.rollWeapon(page, ctx.actor, ctx.item);

  const effects = await api.readEffects(page, ctx.actor);

  expect(effects.map((effect) => effect.name), 'the roll left it alone').toContain(boost.name);
  expect((await consumers.skillPool(ctx, 'Ranged: Light')).boost, 'and its die with it').toBe(1);
});

test('a status that lasts for the combat is removed when its actor leaves', async ({ world, page }) => {
  const encounter = await world.encounter({
    combatants: [
      { actor: 'character' },
    ],
  });
  const statuses = await api.readStatusEffects(page);
  const boost = statuses.find((status) => status.id === 'starwarsffg-boost-combat');
  const [actor] = encounter.actors;

  await api.toggleStatus(page, actor, boost.id, true);

  expect(
    (await api.readEffects(page, actor)).map((effect) => effect.name),
    'the status is on for the fight'
  ).toContain(boost.name);

  await api.removeCombatant(page, encounter.combat, encounter.combatants[0]);

  expect(
    (await api.readEffects(page, actor)).map((effect) => effect.name),
    'and off again when it leaves the fight'
  ).not.toContain(boost.name);
});

test('a status that lasts for the combat stays while the combat runs', async ({ world, page }) => {
  const encounter = await world.encounter({
    combatants: [
      { actor: 'character' },
      { actor: 'character' },
    ],
    roll: true,
  });
  const statuses = await api.readStatusEffects(page);
  const boost = statuses.find((status) => status.id === 'starwarsffg-boost-combat');
  const [actor] = encounter.actors;

  await api.toggleStatus(page, actor, boost.id, true);

  await api.setTurn(page, encounter.combat, 1);
  await api.nextRound(page, encounter.combat);

  expect(
    (await api.readEffects(page, actor)).map((effect) => effect.name),
    'the status is still on'
  ).toContain(boost.name);
});

test('a one-off status on one actor is not removed by another actor rolling', async ({ world, page }) => {
  const roller = await world.build({
    actor: 'character',
    item: 'weapon',
    equipped: true,
    label: 'roller',
  });
  const bystander = await world.build({
    actor: 'character',
    item: 'weapon',
    equipped: true,
    label: 'bystander',
  });
  const statuses = await api.readStatusEffects(page);
  const boost = statuses.find((status) => status.id === 'starwarsffg-boost-once');

  await api.toggleStatus(page, roller.actor, boost.id, true);
  await api.toggleStatus(page, bystander.actor, boost.id, true);

  await api.rollWeapon(page, roller.actor, roller.item);

  const spent = (await api.readEffects(page, roller.actor)).map((effect) => effect.name);
  const kept = (await api.readEffects(page, bystander.actor)).map((effect) => effect.name);

  expect(spent, 'the one who rolled spent theirs').not.toContain(boost.name);
  expect(kept, 'and nobody else lost anything').toContain(boost.name);
});
