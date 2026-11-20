import { test, expect } from '../../support/fixtures';
import * as api from '../../support/api';

/**
 * A GM can pick a sound in the roll dialog: it plays with the roll, and the weapon remembers it
 */

const SOUND = {
  name: 'qa blaster',
  path: 'sounds/dice.wav',
};

async function armed(world, page) {
  world.track(await api.createPlaylist(page, {
    name: 'qa roll sounds',
    sound: SOUND,
  }));
  return world.build({
    actor: 'character',
    item: 'weapon',
    equipped: true,
  });
}

function rollWithSound(page, ctx, from = 'sheet') {
  return api.soundsPlayedDuring(page, () => api.rollWeapon(page, ctx.actor, ctx.item, {
    sound: SOUND.path,
    from,
  }));
}

test('a sound picked in the roll dialog plays with the roll', async ({ world, page }) => {
  const ctx = await armed(world, page);

  expect(await rollWithSound(page, ctx), 'the sound played').toEqual([SOUND.path]);
});

test('#2391 a weapon remembers the sound picked for it', async ({ world, page }) => {
  const ctx = await armed(world, page);

  await rollWithSound(page, ctx);

  await expect.poll(
    () => api.read(page, ctx.item, 'flags.starwarsffg.ffgsound'),
    { message: 'the sound is kept on the weapon' }
  ).toBe(SOUND.path);
});

test('#2391 a weapon rolled before can be rolled with a sound again', async ({ world, page }) => {
  const ctx = await armed(world, page);

  await rollWithSound(page, ctx);

  expect(await rollWithSound(page, ctx), 'the second roll plays it too').toEqual([SOUND.path]);
});

test('#2391 a sound picked for a weapon rolled from a hotbar macro plays and is kept', async ({ world, page }) => {
  const ctx = await armed(world, page);

  expect(await rollWithSound(page, ctx, 'macro'), 'the sound played').toEqual([SOUND.path]);
  await expect.poll(
    () => api.read(page, ctx.item, 'flags.starwarsffg.ffgsound'),
    { message: 'the sound is kept on the weapon' }
  ).toBe(SOUND.path);
});
