import { test, expect } from '../../support/fixtures';
import * as api from '../../support/api';
import { covering } from '../../support/pages/hit-testing';

/**
 * Spending XP, and what the character gets for it.
 */

test('buying a talent deducts its cost from available XP', async ({ world, consumers }) => {
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

  const xp = await consumers.xp(ctx);
  expect(xp.available, 'a talent in the first row of the tree costs 5').toBe(100 - 5);
});

test('buying a talent leaves total XP untouched', async ({ world, consumers }) => {
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

  const xp = await consumers.xp(ctx);
  expect(xp.total, 'total XP is unchanged').toBe(250); // unchanged
});

test('a talent that costs more than the character has cannot be bought', async ({ world, consumers }) => {
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

  const xp = await consumers.xp(ctx);
  const talent = await consumers.talent(ctx);

  expect(xp.available, 'available XP is unchanged').toBe(0); // unchanged
  expect(talent.islearned, 'not learned').toBe(false);
});

test('#2160 a talent purchased from a tree applies its modifiers', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'specialization',
    talents: [
      {
        name: 'qa bought talent',
        islearned: false,
        attributes: [{
          modtype: 'Stat',
          mod: 'Soak',
          value: 1,
        }],
      },
    ],
  });

  await world.buy(ctx, 0);

  expect(await consumers.stat(ctx, 'Soak'), 'the bought talent adds its modifier').toBe(3 + 1);
});

test('#1911 buying a ranked talent twice raises its rank rather than adding a second', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'specialization',
    talents: [
      { name: 'qa ranked talent', islearned: false, isRanked: true, attributes: [] },
      { name: 'qa ranked talent', islearned: false, isRanked: true, attributes: [] },
    ],
  });

  await world.buy(ctx, 0);
  await world.buy(ctx, 1);

  const bought = (await consumers.talentList(ctx)).filter((t) => t.name === 'qa ranked talent');

  expect(bought, 'one entry, however many times it was bought').toHaveLength(1);
  expect(bought[0].rank, 'a rank from each purchase').toBe(2);
  // rules out the other way to reach rank 2 - one node counted twice while the second never landed
  expect(bought[0].sources, 'both nodes are credited').toHaveLength(2);
});

test('#1977 a ranked talent from a specialization is not counted twice', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'specialization',
    talents: [
      {
        name: 'qa grit',
        islearned: false,
        isRanked: true,
        attributes: [{ modtype: 'Stat', mod: 'Wounds', value: 1 }],
      },
      {
        node: 4,
        name: 'qa second wind',
        islearned: false,
        isRanked: true,
        attributes: [{ modtype: 'Stat', mod: 'Strain', value: 1 }],
      },
    ],
  });

  await world.buy(ctx, 0);
  await world.buy(ctx, 1);

  expect(await consumers.stat(ctx, 'Wounds'), 'one rank in the first row is +1').toBe(12 + 1);
  expect(await consumers.stat(ctx, 'Strain'), 'one rank further down the tree is +1').toBe(13 + 1);
});

test('buying a force power upgrade deducts its cost', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'forcepower',
    talents: [
      {
        name: 'qa upgrade',
        islearned: false,
        cost: 10,
        attributes: [{ modtype: 'Stat', mod: 'Wounds', value: 1 }],
      },
    ],
  });

  await world.buy(ctx, 0);

  const xp = await consumers.xp(ctx);
  expect(xp.available, 'the upgrade is priced by its own cost field').toBe(100 - 10);
});

test('buying a skill rank costs more for a non-career skill', async ({ world, consumers }) => {
  const career = await world.build({
    actor: 'character',
    label: 'career',
    actorOverrides: { skills: { 'Piloting: Space': { rank: 1, careerskill: true } } },
  });
  const offCareer = await world.build({
    actor: 'character',
    label: 'off-career',
    actorOverrides: { skills: { 'Piloting: Space': { rank: 1, careerskill: false } } },
  });

  await world.buySkill(career, 'Piloting: Space');
  await world.buySkill(offCareer, 'Piloting: Space');

  expect(await consumers.skillModifier(career, 'Piloting: Space', 'Rank'), 'the rank was bought')
    .toBe(2);
  expect((await consumers.xp(career)).available, 'a career skill at rank 1 costs (1 + 1) * 5')
    .toBe(100 - 10);
  expect((await consumers.xp(offCareer)).available, 'the same rank off-career costs five more')
    .toBe(100 - 15);

  expect((await consumers.xp(offCareer)).stored, 'the stored number is untouched').toBe(100);
});

test('buying a characteristic rank raises the derived stats that depend on it', async ({ world, consumers }) => {
  const ctx = await world.build({ actor: 'character' });

  await world.buyCharacteristic(ctx, 'Brawn');

  expect(
    (await consumers.xp(ctx)).available,
    'a rank of Brawn at 3 costs (3 + 1) * 10'
  ).toBe(100 - 40);
  expect(await consumers.stat(ctx, 'Brawn'), 'the rank itself').toBe(4);
  expect(await consumers.stat(ctx, 'Soak'), 'soak follows brawn').toBe(3 + 1);
});

test('granting a talent for free deducts no XP', async ({ page, world, consumers }) => {
  const ctx = await world.build({ actor: 'character' });
  const talent = world.track(await api.createItem(page, {
    type: 'talent',
    name: 'qa granted talent',
  }));

  const granted = await api.dropForPurchase(page, ctx.actor, talent, 'grant');

  const xp = await consumers.xp(ctx);
  expect(granted, 'the talent landed on the actor').not.toBeNull();
  expect(xp.available, 'a grant is not a purchase').toBe(100);
  expect(xp.total, 'total XP is unchanged').toBe(250); // unchanged
});

test('#1835 the purchase dialog opens for a signature ability', async ({ page, world }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'specialization',
  });
  const ability = world.track(await api.createItem(page, {
    type: 'signatureability',
    name: 'qa signature ability',
  }));
  await world.addItem(ctx, {
    item: 'career',
    itemOverrides: {
      specializations: { qa: { name: ctx.itemName } },
      signatureabilities: { qa: { name: 'qa signature ability', id: await api.read(page, ability, 'id') } },
    },
  });

  await api.browsePurchases(page, ctx.actor, 'signatureability');

  expect(await api.waitForDialog(page), 'the dialog names what is being bought')
    .toBe('Purchase Signature Ability');
  await api.closeDialogs(page);
});

test('#1835 the purchase dialog opens for a specialization', async ({ page, world }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'career',
  });

  await api.browsePurchases(page, ctx.actor, 'specialization');

  expect(await api.waitForDialog(page), 'the dialog names what is being bought')
    .toBe('Purchase Specialization');
  await api.closeDialogs(page);
});

test.fixme('#2124 two force power upgrades can be linked', async ({ page, world }) => {
  const power = await world.item({
    item: 'forcepower',
    itemOverrides: {
      isEditing: true,
    },
  });
  const sheet = page.locator(`#${await api.openSheet(page, power)}`);

  await sheet.locator('[data-action="combine"][data-key="upgrade0"]').click();
  await expect.poll(
    () => api.read(page, power, 'system.upgrades.upgrade0.size'),
    { message: 'the pair combined' }
  ).toBe('double');

  const link = sheet.locator('[data-action="link-right"][data-key="upgrade0"]');
  expect(await covering(link), 'nothing is layered over the link point').toBeNull();

  await link.click();

  // FIXME: see #2124
  expect(await api.read(page, power, 'system.upgrades.upgrade0.links-right'), 'the combined box links right')
    .toBe(true);
  await api.closeSheet(page, power);
});

test('#2264 a specialization keeps its talent tree links when a talent is bought', async ({ page, world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'specialization',
    talents: [
      {
        name: 'qa linked talent',
        islearned: false,
        linkRight: true,
        attributes: [],
      },
      {
        name: 'qa bought talent',
        islearned: false,
        attributes: [],
      },
    ],
  });

  await world.buy(ctx, 1);

  const talent = await consumers.talent(ctx, 1);
  expect(talent.islearned, 'the talent was bought').toBe(true);
  expect(
    await api.read(page, ctx.item, 'system.talents.talent0.links-right'),
    'the link survives'
  ).toBe(true);
});
