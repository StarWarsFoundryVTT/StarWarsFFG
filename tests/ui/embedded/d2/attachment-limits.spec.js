import {expect, test} from '../../../support/fixtures';

test('an attachment is refused when the item has no free hardpoints', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'armour',
    itemOverrides: { soak: { value: 0, adjusted: 0 }, defence: { value: 0, adjusted: 0 }, hardpoints: { value: 2, adjusted: 2, current: 0 } },
  });

  expect(await world.tryAttach(ctx, { hardpoints: 5 }), 'Attachment is refused with no hardpoints').not.toBeNull();
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
