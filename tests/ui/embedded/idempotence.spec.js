import { test, expect } from '../../support/fixtures';

/**
 * The same action twice must leave the world where doing it once did - at every depth.
 */

const DELTA = 2;
const BASE = { actor: 'character', item: 'armour', equipped: true };

const ROWS = [{ modtype: 'Stat', mod: 'Soak', value: DELTA }];
const QUALITY = { name: 'qa soak quality', key: 'Soak', value: DELTA, active: true };
const ATTACHMENT = {
  name: 'insert',
  modifications: [{ name: 'qa soak quality', key: 'Soak', value: DELTA, installed: true }],
};

test('D1: re-submitting the item’s own modifier rows does not double its effect', async ({ world, consumers }) => {
  const ctx = await world.build({ ...BASE, label: 'd1', attributes: ROWS });
  const before = await consumers.read(ctx, 'Soak');

  await world.applyAgain(ctx);

  expect({ before, after: await consumers.read(ctx, 'Soak') }).toBeStable();
});

test('D1: a reload does not change a modifier on the item itself', async ({ world, consumers }) => {
  const ctx = await world.build({ ...BASE, label: 'd1-reload', attributes: ROWS });
  const before = await consumers.read(ctx, 'Soak');

  await world.reload();

  expect({ before, after: await consumers.read(ctx, 'Soak') }).toBeStable();
});

test('D2: dropping the same quality on again does not double its effect', async ({ world, consumers }) => {
  const ctx = await world.build({ ...BASE, label: 'd2', modifier: QUALITY });
  const before = await consumers.read(ctx, 'Soak');

  await world.applyAgain(ctx);

  expect({ before, after: await consumers.read(ctx, 'Soak') }).toBeStable();
});

test('D2: a reload does not change a named quality on the item', async ({ world, consumers }) => {
  const ctx = await world.build({ ...BASE, label: 'd2-reload', modifier: QUALITY });
  const before = await consumers.read(ctx, 'Soak');

  await world.reload();

  expect({ before, after: await consumers.read(ctx, 'Soak') }).toBeStable();
});

test('D3: a reload does not change a Modification inside an attachment', async ({ world, consumers }) => {
  const ctx = await world.build({ ...BASE, label: 'd3-reload', attachment: ATTACHMENT });
  const before = await consumers.read(ctx, 'Soak');

  await world.reload();

  expect({ before, after: await consumers.read(ctx, 'Soak') }).toBeStable();
});
