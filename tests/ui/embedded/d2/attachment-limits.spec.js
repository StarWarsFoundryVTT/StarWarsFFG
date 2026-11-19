import {expect, test} from '../../../support/fixtures';

test('an attachment past the free hardpoints is still accepted, and spends them', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'armour',
    itemOverrides: { soak: { value: 0, adjusted: 0 }, defence: { value: 0, adjusted: 0 }, hardpoints: { value: 2, adjusted: 2, current: 2 } },
  });

  await world.attach(ctx, { hardpoints: 2 });
  expect(
    await world.tryAttach(ctx, { hardpoints: 1 }),
    'Attachment is accepted with no hardpoints left',
  ).toBeNull();
  const hp = await consumers.hardpoints(ctx);

  expect(hp.current, 'Both attachments count against the remaining hardpoints').toBe(2 - 2 - 1);
});

test('an attachment consumes hardpoints from the item budget', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'armour',
    itemOverrides: { soak: { value: 0, adjusted: 0 }, defence: { value: 0, adjusted: 0 }, hardpoints: { value: 2, adjusted: 2, current: 2 } },
  });

  await world.attach(ctx, { hardpoints: 1 });
  const hp = await consumers.hardpoints(ctx);

  expect(hp.current, 'Attachment updates available hardpoints').toBe(2 - 1);
});

test('attachment type is enforced', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'weapon',
    itemOverrides: {hardpoints: { value: 2, adjusted: 2, current: 2 } },
  });

  expect(
    await world.tryAttach(ctx, { type: 'armour' }),
    'Armor attachment is refused on weapon'
  ).toMatch(/type mismatch/);

  expect(
    await world.tryAttach(ctx, { type: 'weapon' }),
    'Weapon attachment is accepted on weapon'
  ).toBeNull();

  expect(
    await world.tryAttach(ctx, { type: 'all' }),
    'Generic attachment is accepted on weapon'
  ).toBeNull();
});

test('an attachment that grants hardpoints raises the item budget', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'weapon',
    itemOverrides: { hardpoints: { value: 2, adjusted: 2, current: 2 } },
  });

  await world.attach(ctx, {
    hardpoints: 1,
    baseMods: [{ modtype: 'Weapon Stat', mod: 'hardpoints', value: 1 }],
  });
  const hp = await consumers.hardpoints(ctx);

  expect(hp.adjusted, 'Attachment hardpoint modifier raises the budget').toBe(2 + 1);
  expect(hp.current, 'Granted hardpoints are spendable').toBe(2 + 1 - 1);
});
