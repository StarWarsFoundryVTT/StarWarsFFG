import { test, expect } from '../../../support/fixtures';
import * as api from '../../../support/api';

/**
 * Two sources granting the same quality must sum, not collide.
 */

test('#1307 two attachments granting the same quality sum their ranks', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character', item: 'weapon', equipped: true,
    attachment: {
      name: 'mount',
      modifications: [{ name: 'qa accurate', key: 'Damage', value: 2, installed: true }],
    },
  });

  await world.applyAgain(ctx); // a second source of the same named quality

  expect(await consumers.qualityRank(ctx, 'qa accurate'), 'one rank from each attachment').toBe(2);
});

test('#2291 a rank 2 quality applied twice yields rank 4, not rank 3', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character', item: 'weapon', equipped: true,
    attachment: {
      name: 'mount',
      modifications: [{ name: 'qa accurate', key: 'damage', modtype: 'Weapon Stat', value: 1, rank: 2, installed: true }],
    },
  });

  await world.applyAgain(ctx); // a second source of the same named quality

  expect(await consumers.qualityRank(ctx, 'qa accurate'), 'two ranks from each of two sources').toBe(4);
});

test('#2290 two range-shifting attachments both move the range', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character', item: 'weapon', equipped: true,
    attachment: { name: 'barrel', baseMods: [{ modtype: 'Weapon Stat', mod: 'range', value: 1 }] },
  });

  await world.attach(ctx, {
    name: 'choke', baseMods: [{ modtype: 'Weapon Stat', mod: 'range', value: 1 }],
  });

  // the fixture starts at Medium
  expect(await consumers.itemAdjustedName(ctx, 'Range'), 'both shifts counted').toBe('Extreme');
});

test('#2290 a range modifier on the weapon itself moves the range', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character', item: 'weapon', equipped: true,
    attributes: [{ modtype: 'Weapon Stat', mod: 'range', value: 1 }],
  });

  // the fixture starts at Medium
  expect(await consumers.itemAdjustedName(ctx, 'Range'), 'the weapon\'s own modifier counts').toBe('Long');
});

test('#2290 a range modifier on the weapon adds to one from an attachment', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character', item: 'weapon', equipped: true,
    attributes: [{ modtype: 'Weapon Stat', mod: 'range', value: 1 }],
    attachment: { name: 'barrel', baseMods: [{ modtype: 'Weapon Stat', mod: 'range', value: 1 }] },
  });

  expect(await consumers.itemAdjustedName(ctx, 'Range'), 'both sources counted').toBe('Extreme');
});

test('a quality on the item and the same-named quality on an attachment stack', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character', item: 'weapon', equipped: true,
    attachment: {
      name: 'mount',
      modifications: [{ name: 'qa accurate', key: 'damage', modtype: 'Weapon Stat', value: 1, installed: true }],
    },
  });

  // the item's own qualities are merged first, then each attachment's are folded into them
  await world.addModifier(ctx, { name: 'qa accurate', key: 'damage', modtype: 'Weapon Stat', value: 1, active: true });

  expect(await consumers.qualityRank(ctx, 'qa accurate'), 'one from the item, one from the attachment').toBe(2);
});

test('differently-named qualities from two attachments stay separate', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character', item: 'weapon', equipped: true,
    attachment: {
      name: 'mount',
      modifications: [{ name: 'qa accurate', key: 'damage', modtype: 'Weapon Stat', value: 1, installed: true }],
    },
  });

  await world.attach(ctx, {
    name: 'rail',
    modifications: [{ name: 'qa pierce', key: 'critical', modtype: 'Weapon Stat', value: 1, installed: true }],
  });

  expect(await consumers.qualityRank(ctx, 'qa accurate'), 'the first stays at its own rank').toBe(1);
  expect(await consumers.qualityRank(ctx, 'qa pierce'), 'and so does the second').toBe(1);
});

test('removing one of two stacked sources drops the rank back rather than to zero', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character', item: 'weapon', equipped: true,
    attachment: {
      name: 'mount',
      modifications: [{ name: 'qa accurate', key: 'damage', modtype: 'Weapon Stat', value: 1, installed: true }],
    },
  });

  const second = await world.attach(ctx, {
    name: 'rail',
    modifications: [{ name: 'qa accurate', key: 'damage', modtype: 'Weapon Stat', value: 1, installed: true }],
  });

  expect(await consumers.qualityRank(ctx, 'qa accurate'), 'both sources counted').toBe(2);

  await world.removeAttachment(ctx, second);

  expect(await consumers.qualityRank(ctx, 'qa accurate'), 'one source left').toBe(1);
});

test.fixme('#2311 a quality granting Defence keeps both of its changes', async ({ world, page, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'armour',
    equipped: true,
    modifier: {
      name: 'qa reinforced',
      key: 'defence',
      modtype: 'Armor Stat',
      value: 1,
      active: true,
    },
  });

  // defense explodes into melee and ranged, so the quality's effect carries two changes and `syncAEStatus`
  // rebuilds it from the first one alone
  const granted = async () => {
    const effects = await api.readItemEffects(page, ctx.item);
    return effects
      .filter((effect) => effect.name !== '(inherent)')
      .flatMap((effect) => effect.changes.map((change) => change.key))
      .filter((key) => key.startsWith('system.stats.defence.'))
      .sort();
  };
  const both = ['system.stats.defence.melee', 'system.stats.defence.ranged'];

  expect(await granted(), 'the quality grants both kinds of defence').toEqual(both);

  await world.equip(ctx, false);
  await world.equip(ctx, true);

  // FIXME: #2311
  expect(await granted(), 'and still does after being taken off and put back on').toEqual(both);
  expect(await consumers.stat(ctx, 'Defence-Melee'), 'the armour and the quality, in melee').toBe(2);
  expect(await consumers.stat(ctx, 'Defence-Ranged'), 'and the same at range').toBe(2);
});
