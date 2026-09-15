import { test, expect } from '../../support/fixtures';
import * as api from '../../support/api';
import * as creator from '../../support/pages/character-creator';

/**
 * The character creation wizard.
 */

test('the creator completes and produces an actor', async ({ world, page }) => {
  const species = await world.addCreatorChoice({ item: 'species' });
  const career = await world.addCreatorChoice({ item: 'career' });

  await creator.open(page);
  await creator.selectSpecies(page, species);
  await creator.selectCareer(page, career);
  world.track(await creator.tempActor(page));

  const made = world.track(await creator.finish(page));

  expect(await api.read(page, made, 'type'), 'a character came out of it').toBe('character');
  expect(
    await api.read(page, made, 'system.experience.total'),
    'with the XP its species grants'
  ).toBe(100);

  await creator.close(page);
});

test.fixme('#2244 a free career skill rank raises that skill on the character', async ({ world, page }) => {
  const species = await world.addCreatorChoice({ item: 'species' });
  const career = await world.addCreatorChoice({
    item: 'career',
    itemOverrides: {
      careerSkills: { careerSkill0: 'Gunnery' },
    },
  });

  await creator.open(page);
  await creator.selectSpecies(page, species);
  await creator.selectCareer(page, career);
  await creator.takeSkillRank(page, 'Gunnery');
  world.track(await creator.tempActor(page));

  const made = world.track(await creator.finish(page));

  // FIXME: #2244
  expect(await api.read(page, made, 'system.skills.Gunnery.rank'), 'the free rank landed').toBe(1);

  await creator.close(page);
});

test.fixme('#2244 a talent bought with XP reaches the finished character', async ({ world, page }) => {
  const species = await world.addCreatorChoice({ item: 'species' });
  const specialization = await world.addCreatorChoice({
    item: 'specialization',
    talents: [
      {
        name: 'qa toughened',
        islearned: false,
        attributes: [{ modtype: 'Stat', mod: 'Wounds', value: 2 }],
      },
    ],
  });
  const career = await world.addCreatorChoice({
    item: 'career',
    itemOverrides: {
      specializations: { qa: { name: 'qa specialization', source: specialization } },
    },
  });

  await creator.open(page);
  await creator.selectSpecies(page, species);
  await creator.selectCareer(page, career);
  await creator.selectSpecialization(page, specialization);
  await creator.buyTalent(page, 'talent0');
  world.track(await creator.tempActor(page));

  const made = world.track(await creator.finish(page));
  const items = await api.readOwnedItems(page, made);
  const bought = items.find((item) => item.type === 'specialization');

  // FIXME: #2244
  expect(bought, 'the specialization came along').toBeDefined();
  expect(
    await api.read(page, bought.uuid, 'system.talents.talent0.islearned'),
    'with the talent that was paid for learned'
  ).toBe(true);

  await creator.close(page);
});

/** What a character is made of, beside its items - the same for the preview and the product. */
const DERIVED = [
  'system.characteristics.Brawn.value',
  'system.characteristics.Agility.value',
  'system.characteristics.Willpower.value',
  'system.stats.wounds.max',
  'system.stats.strain.max',
  'system.stats.soak.value',
  'system.experience.total',
];

test('the finished character matches the one the wizard previewed', async ({ world, page }) => {
  const species = await world.addCreatorChoice({ item: 'species' });
  const career = await world.addCreatorChoice({ item: 'career' });

  await creator.open(page);
  await creator.selectSpecies(page, species);
  await creator.selectCareer(page, career);

  const preview = world.track(await creator.tempActor(page));
  const previewed = await api.readMany(page, preview, DERIVED);

  const made = world.track(await creator.finish(page));

  expect(
    await api.readMany(page, made, DERIVED),
    'what was shown is what was made'
  ).toEqual(previewed);

  await creator.close(page);
});

test('choosing a species applies its characteristics and thresholds', async ({ world, page }) => {
  const career = await world.addCreatorChoice({ item: 'career' });
  const species = await world.addCreatorChoice({
    item: 'species',
    attributes: [
      { key: 'Brawn', modtype: 'Characteristic', mod: 'Brawn', value: 3 },
      { key: 'Wounds', modtype: 'Stat', mod: 'Wounds', value: 10 },
      { key: 'Strain', modtype: 'Stat', mod: 'Strain', value: 11 },
    ],
  });

  const carried = [
    'system.characteristics.Brawn.value',
    'system.stats.wounds.max',
    'system.stats.strain.max',
  ];

  await creator.open(page);
  await creator.selectCareer(page, career);

  const before = await api.readMany(page, world.track(await creator.tempActor(page)), carried);

  await creator.selectSpecies(page, species);

  const after = await api.readMany(page, world.track(await creator.tempActor(page)), carried);

  expect(after[carried[0]] - before[carried[0]], 'the characteristic it grants').toBe(3);
  expect(after[carried[1]] - before[carried[1]], 'the wound threshold it grants').toBe(10);
  expect(after[carried[2]] - before[carried[2]], 'and the strain threshold').toBe(11);

  await creator.close(page);
});

test('choosing a species grants its talents once, not twice', async ({ world, page }) => {
  const talent = await world.item({ item: 'talent', label: 'species' });
  const species = await world.addCreatorChoice({
    item: 'species',
    itemOverrides: {
      talents: { qa: { source: talent } },
    },
  });
  const career = await world.addCreatorChoice({ item: 'career' });

  await creator.open(page);
  await creator.selectSpecies(page, species);
  await creator.selectCareer(page, career);
  world.track(await creator.tempActor(page));

  const made = world.track(await creator.finish(page));
  const items = await api.readOwnedItems(page, made);

  expect(items.filter((item) => item.type === 'talent'), 'one copy of it').toHaveLength(1);
  expect(items.filter((item) => item.type === 'species'), 'and one species').toHaveLength(1);

  await creator.close(page);
});

test.fixme('#2164 choosing a career marks its career skills', async ({ world, page }) => {
  const career = await world.addCreatorChoice({
    item: 'career',
    itemOverrides: {
      careerSkills: { careerSkill0: 'Gunnery' },
    },
  });

  await creator.open(page);
  await creator.selectCareer(page, career);
  world.track(await creator.tempActor(page));

  // FIXME: #2164
  expect(await creator.careerSkill(page, 'Gunnery'), 'the listed skill').toBe(true);
  expect(await creator.careerSkill(page, 'Piloting: Space'), 'an unlisted one').toBe(false);

  await creator.close(page);
});

test('buying a characteristic rank deducts the right XP', async ({ world, page }) => {
  const species = await world.addCreatorChoice({ item: 'species' });
  const career = await world.addCreatorChoice({ item: 'career' });

  await creator.open(page);
  await creator.selectSpecies(page, species);
  await creator.selectCareer(page, career);

  const before = await creator.budget(page);
  const started = await api.read(
    page, world.track(await creator.tempActor(page)), 'system.characteristics.Brawn.value');

  await creator.buyCharacteristic(page, 'Brawn');

  const after = await creator.budget(page);
  const raised = await api.read(
    page, world.track(await creator.tempActor(page)), 'system.characteristics.Brawn.value');

  expect(raised, 'the rank was bought').toBe(started + 1);
  expect(before.available - after.available, 'and cost what that rank costs').toBe(raised * 10);
  expect(after.total, 'the earned total is untouched').toBe(before.total);

  await creator.close(page);
});

test('removing a specialization refunds what it cost', async ({ world, page }) => {
  const species = await world.addCreatorChoice({ item: 'species' });
  const first = await world.addCreatorChoice({ item: 'specialization', label: 'first' });
  const extra = await world.addCreatorChoice({ item: 'specialization', label: 'extra' });
  const career = await world.addCreatorChoice({
    item: 'career',
    itemOverrides: {
      specializations: { qa: { name: await api.read(page, first, 'name'), source: first } },
    },
  });

  await creator.open(page);
  await creator.selectSpecies(page, species);
  await creator.selectCareer(page, career);
  await creator.selectSpecialization(page, first);

  const before = await creator.budget(page);
  const extraName = await api.read(page, extra, 'name');

  await creator.buySpecialization(page, extraName);

  const spent = await creator.budget(page);

  expect(spent.available, 'the second one costs something').toBeLessThan(before.available);

  await creator.removeSpecialization(page, extraName);

  expect(
    (await creator.budget(page)).available,
    'and giving it back returns what it cost'
  ).toBe(before.available);

  await creator.close(page);
});

test('removing a force power refunds its talents too', async ({ world, page }) => {
  const species = await world.addCreatorChoice({ item: 'species' });
  const career = await world.addCreatorChoice({ item: 'career' });
  const power = await world.addCreatorChoice({
    item: 'forcepower',
    talents: [
      { name: 'qa upgrade', islearned: false, cost: 10, attributes: [] },
    ],
  });

  await creator.open(page);
  await creator.selectSpecies(page, species);
  await creator.selectCareer(page, career);

  const before = await creator.budget(page);
  const powerName = await api.read(page, power, 'name');

  await creator.buyForcePower(page, powerName);
  await creator.buyForcePowerUpgrade(page, 'upgrade0', powerName);

  const spent = await creator.budget(page);

  expect(spent.available, 'the power and its upgrade both cost').toBeLessThan(before.available);

  await creator.removeForcePower(page, powerName);

  expect(
    (await creator.budget(page)).available,
    'and both come back'
  ).toBe(before.available);

  await creator.close(page);
});

test('obligation chosen for extra XP raises both the obligation and the budget', async ({ world, page }) => {
  await creator.open(page);
  await creator.chooseRules(page, 'eote');

  const before = {
    xp: (await creator.budget(page)).total,
    owed: (await creator.obligation(page)).available,
  };

  await creator.chooseStartingBonus(page, '10xp');

  const after = {
    xp: (await creator.budget(page)).total,
    owed: (await creator.obligation(page)).available,
  };

  expect(after.xp - before.xp, 'the XP it grants').toBe(10);
  expect(after.owed - before.owed, 'and the obligation it is taken against').toBe(10);

  await creator.close(page);
});

test('gear bought in the shop is deducted from starting credits', async ({ world, page }) => {
  const species = await world.addCreatorChoice({ item: 'species' });
  const career = await world.addCreatorChoice({ item: 'career' });
  const gear = await world.addCreatorChoice({
    item: 'gear',
    itemOverrides: {
      price: { value: 250, adjusted: 250 },
    },
  });

  await creator.open(page);
  await creator.selectSpecies(page, species);
  await creator.selectCareer(page, career);

  const before = await creator.credits(page);

  await creator.buyGear(page, gear);

  const after = await creator.credits(page);

  expect(before.available - after.available, 'the price of what was bought').toBe(250);
  expect(after.total, 'the purse it came out of is unchanged').toBe(before.total);

  await creator.close(page);
});

test('refunding gear returns the credits', async ({ world, page }) => {
  const species = await world.addCreatorChoice({ item: 'species' });
  const career = await world.addCreatorChoice({ item: 'career' });
  const gear = await world.addCreatorChoice({
    item: 'gear',
    itemOverrides: {
      price: { value: 250, adjusted: 250 },
    },
  });

  await creator.open(page);
  await creator.selectSpecies(page, species);
  await creator.selectCareer(page, career);

  const before = await creator.credits(page);
  const name = await api.read(page, gear, 'name');

  await creator.buyGear(page, gear);

  expect((await creator.credits(page)).available, 'bought first').toBe(before.available - 250);

  await creator.refundGear(page, name);

  expect((await creator.credits(page)).available, 'and the credits come back').toBe(before.available);

  await creator.close(page);
});

test('the review tab totals match what the actor is created with', async ({ world, page }) => {
  const species = await world.addCreatorChoice({ item: 'species' });
  const career = await world.addCreatorChoice({ item: 'career' });
  const gear = await world.addCreatorChoice({
    item: 'gear',
    itemOverrides: {
      price: { value: 250, adjusted: 250 },
    },
  });

  await creator.open(page);
  await creator.selectSpecies(page, species);
  await creator.selectCareer(page, career);

  await creator.buyCharacteristic(page, 'Brawn');
  await creator.buyGear(page, gear);

  const reckoned = { xp: await creator.budget(page), credits: await creator.credits(page) };
  const made = world.track(await creator.finish(page));

  expect(
    await api.read(page, made, 'system.experience.total'),
    'the XP it was given'
  ).toBe(reckoned.xp.total);
  expect(
    await api.read(page, made, 'system.experience.available'),
    'and what is left of it'
  ).toBe(reckoned.xp.available);
  expect(
    await api.read(page, made, 'system.stats.credits.value'),
    'and the credits, with the spending credits kept'
  ).toBe(reckoned.credits.available + reckoned.credits.spending);

  await creator.close(page);
});

test('a wizard closed before review creates no actor', async ({ world, page }) => {
  const species = await world.addCreatorChoice({ item: 'species' });
  const career = await world.addCreatorChoice({ item: 'career' });

  const before = await api.readActors(page);

  await creator.open(page);
  await creator.selectSpecies(page, species);
  await creator.selectCareer(page, career);

  const preview = world.track(await creator.tempActor(page));

  await creator.close(page);

  const added = (await api.readActors(page)).filter(
    (actor) => !before.some((had) => had.id === actor.id)
  );

  expect(
    added.map((actor) => actor.uuid),
    'only the wizard\'s own preview'
  ).toEqual([preview]);
});
