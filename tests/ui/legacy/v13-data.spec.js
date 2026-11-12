import { test, expect } from '../../support/fixtures';
import { LEGACY_FIXTURES, capturedEffects, readEffectSummaries, readLike } from '../../support/legacy';

/**
 * Documents saved by v13 still read the way v13 read them
 */

for (const name of LEGACY_FIXTURES) {
  test(`${name} reads as it did when captured`, async ({ world, page, consumers }) => {
    const { ctx, expected } = await world.legacy(name);
    const { effects: _effects, ...readings } = expected;

    expect(await readEffectSummaries(page, ctx.actor), 'its effects came through').toEqual(capturedEffects(expected));
    expect(await readLike(consumers, ctx, expected), 'and the system reads it the same').toEqual(readings);
  });
}

test('status durations survive being saved again and reloaded', async ({ world, page }) => {
  const { ctx, expected } = await world.legacy('statuses-once');

  // an update makes the server write the effects back in the running version's shape
  await page.evaluate(async (uuid) => {
    const actor = await fromUuid(uuid);
    for (const effect of actor.effects) await effect.update({ 'flags.starwarsffg.qaTouched': true });
  }, ctx.actor);
  await world.reload();

  const durations = (await readEffectSummaries(page, ctx.actor)).map((effect) => [effect.name, effect.duration]);

  expect(durations, 'each status still knows how long it lasts').toEqual(
    capturedEffects(expected).map((effect) => [effect.name, effect.duration]));
});

test('armor from a v13 compendium grants the same when dropped on a new actor', async ({ world, consumers }) => {
  const { ctx: legacy, expected } = await world.legacy('compendium-armour');
  const ctx = await world.place(legacy.source, {
    actor: 'character',
    equipped: true,
  });

  for (const [key, value] of Object.entries(expected.stats)) {
    expect(await consumers.actorStat(ctx, key), `${key} as it was`).toBe(value);
  }
});
