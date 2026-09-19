import { test, expect } from '../../support/fixtures';
import * as api from '../../support/api';

/**
 * The built-in pilot role in a world whose skill theme is not the stock one.
 */

test.fixme('#2282 the built-in pilot role works when the skill list has been renamed', async ({ world, page, consumers }) => {
  const themes = await api.skillThemeCopy(page, 'starwars', 'qa-theme');

  await world.setSetting('arraySkillList', themes);
  await world.setSetting('skilltheme', 'qa-theme');

  const ship = await world.build({
    actor: 'vehicle',
    actorOverrides: {
      spaceShip: true,
    },
  });
  const pilot = await world.build({
    actor: 'character',
  });

  await api.setCrewRoles(page, ship.actor, pilot.actor, ['Pilot']);

  // FIXME: #2282
  expect(await consumers.pilotPool(ship.actor, pilot.actor), 'the same roll as on a stock world').toEqual({
    ability: 1, proficiency: 1, boost: 1,
    setback: 0, remsetback: 0, difficulty: 2, challenge: 0, force: 0,
  });
});
