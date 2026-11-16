import { test, expect } from '../../support/fixtures';
import * as api from '../../support/api';
import * as actorSheet from '../../support/pages/actor-sheet';

/**
 * A skill can be pointed at a different characteristic from its row's right-click menu.
 */

test('a skill can be rolled off a different characteristic', async ({ world, page }) => {
  const ctx = await world.build({
    actor: 'character',
  });
  const sheet = await api.openSheet(page, ctx.actor);

  await actorSheet.changeSkillCharacteristic(page, sheet, 'Athletics', 'Agility');

  await expect.poll(
    () => api.read(page, ctx.actor, 'system.skills.Athletics.characteristic'),
    { message: 'athletics now uses agility' }
  ).toBe('Agility');
});
