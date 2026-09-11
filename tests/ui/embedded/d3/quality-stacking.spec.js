import { test, expect } from '../../../support/fixtures';

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

test.fixme('a rank 2 quality applied twice yields rank 4, not rank 3', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character', item: 'weapon', equipped: true,
    attachment: {
      name: 'mount',
      modifications: [{ name: 'qa accurate', key: 'damage', modtype: 'Weapon Stat', value: 1, rank: 2, installed: true }],
    },
  });

  await world.applyAgain(ctx); // a second source of the same named quality

  // FIXME: this returns 2 instead of 4 (see #2291)
  expect(await consumers.qualityRank(ctx, 'qa accurate'), 'two ranks from each of two sources').toBe(4);
});

test.fixme('two range-shifting attachments both move the range', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character', item: 'weapon', equipped: true,
    attachment: { name: 'barrel', baseMods: [{ modtype: 'Weapon Stat', mod: 'range', value: 1 }] },
  });

  await world.attach(ctx, {
    name: 'choke', baseMods: [{ modtype: 'Weapon Stat', mod: 'range', value: 1 }],
  });

  // the fixture starts at Medium
  // FIXME: this returns Long instead of Extreme (see #2290)
  expect(await consumers.itemAdjustedName(ctx, 'Range'), 'both shifts counted').toBe('Extreme');
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
