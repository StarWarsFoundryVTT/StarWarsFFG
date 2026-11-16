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

function rollWithSound(page, ctx) {
  return api.soundsPlayedDuring(page, () => api.rollWeapon(page, ctx.actor, ctx.item, {
    sound: SOUND.path,
    from: 'sheet',
  }));
}

test('a sound picked in the roll dialog plays with the roll', async ({ world, page }) => {
  const ctx = await armed(world, page);

  expect(await rollWithSound(page, ctx), 'the sound played').toEqual([SOUND.path]);
});

test.fixme('#2391 a weapon remembers the sound picked for it', async ({ world, page }) => {
  const ctx = await armed(world, page);

  await rollWithSound(page, ctx);

  await expect.poll(
    () => api.read(page, ctx.item, 'flags.starwarsffg.ffgsound'),
    { message: 'the sound is kept on the weapon' }
  ).toBe(SOUND.path);
});

test.fixme('#2391 a weapon rolled before can be rolled with a sound again', async ({ world, page }) => {
  const ctx = await armed(world, page);

  await rollWithSound(page, ctx);

  expect(await rollWithSound(page, ctx), 'the second roll plays it too').toEqual([SOUND.path]);
});
