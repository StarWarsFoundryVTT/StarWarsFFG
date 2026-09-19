import { test, expect } from '../../support/fixtures';
import * as api from '../../support/api';

/**
 * Combat with `useGenericSlots` turned off.
 */

test('#2248 initiative can be rolled with generic slots turned off', async ({ world, page }) => {
  await world.setSetting('useGenericSlots', false);
  const encounter = await world.encounter({
    combatants: [
      { actor: 'character' },
    ],
  });

  await api.rollInitiative(page, encounter.combat, { skill: 'Vigilance' });

  const combatants = await api.readCombatants(page, encounter.combat);
  expect(combatants, 'one combatant').toHaveLength(1);
  expect(combatants[0].initiative, 'it rolled').not.toBeNull();
  expect(await api.readLastChatFlavor(page), 'from the pool that was asked for').toContain('Vigilance');
});
