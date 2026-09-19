import { test, expect } from '../../support/fixtures';

/**
 * Remove Setback with `ApplyRemoveSetbackMods` turned on.
 */

test('Remove Setback takes a setback die out of the roll', async ({ world, consumers }) => {
  await world.setSetting('ApplyRemoveSetbackMods', true);

  const ctx = await world.build({
    actor: 'character',
    item: 'weapon',
    equipped: true,
    attributes: [
      {
        modtype: 'Roll Modifiers',
        mod: 'Add Setback',
        value: 2,
      },
      {
        modtype: 'Roll Modifiers',
        mod: 'Remove Setback',
        value: 1,
      },
    ],
  });

  const pool = await consumers.poolDice(ctx);

  expect([pool.setback, pool.remsetback], 'the pool still holds both').toEqual([2, 1]);
  expect(await consumers.poolExpression(ctx), 'and the roll is made with one fewer').toBe('1ds');
});
