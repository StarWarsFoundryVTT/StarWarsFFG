import {expect, test} from '../../../support/fixtures';

test('a named modifier on the item reaches the actor', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character', item: 'armour', equipped: true,
    modifier: { name: 'qa wounds', key: 'Wounds', value: 1 },
  });

  expect(await consumers.stat(ctx, 'Wounds'), 'modifier updates wounds').toBe(12 + 1);
});

test('a named modifier on the item shows in the roll pool', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character', item: 'weapon', equipped: true,
    modifier: { name: 'qa boosted', key: 'Add Boost', modtype: 'Roll Modifiers', value: 1 },
  });

  const pool = await consumers.poolDice(ctx);
  expect(pool.boost, 'quality adds a boost die').toBe(1);
});

test('a named modifier on the item shows on its send-to-chat card', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character', item: 'armour', equipped: true,
    modifier: { name: 'qa wounds', key: 'Wounds', value: 1 },
  });

  expect(await consumers.chatCard(ctx, 'qa wounds'), 'quality is shown on the chat card').toBe(true);
});

test('two different modifiers on one item both apply', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character', item: 'armour', equipped: true,
    modifier: { name: 'qa wounds', key: 'Wounds', value: 1 },
  });

  await world.addModifier(ctx, { name: 'qa wounds 2', key: 'Wounds', value: 1 });

  expect(await consumers.stat(ctx, 'Wounds'), 'modifier updates wounds').toBe(12 + 1 + 1);
});

test('a modifier on the item and one on an attachment both apply', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character', item: 'armour', equipped: true,
    modifier: { name: 'qa wounds', key: 'Wounds', value: 1 },
    attachment: {
      name: 'harness',
      attributes: [
        { modtype: 'Stat', mod: 'Wounds', value: 1 },
      ],
    },
  });

  expect(await consumers.stat(ctx, 'Wounds'), 'modifier updates wounds').toBe(12 + 1 + 1);
});

test('removing a modifier removes its contribution', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character', item: 'armour', equipped: true,
    modifier: { name: 'qa wounds', key: 'Wounds', value: 1 },
  });

  expect(await consumers.stat(ctx, 'Wounds'), 'wounds are increased when added').toBe(12 + 1);
  await world.removeModifier(ctx);
  expect(await consumers.stat(ctx, 'Wounds'), 'wounds are lowered when removed').toBe(12);
});

test.fixme('a modifier with a rank applies once per rank', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character', item: 'armour', equipped: true,
    modifier: { name: 'qa wounds', key: 'Wounds', value: 1, rank: 2 },
  });

  // FIXME: this does actually fail in the UI - at least after the item is equipped/unequipped
  expect(await consumers.stat(ctx, 'Wounds'), 'two modifiers update wounds').toBe(12 + 2);
});
