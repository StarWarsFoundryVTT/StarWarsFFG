import { test, expect } from '../../support/fixtures';
import * as api from '../../support/api';

/**
 * Which pool the initiative dialog starts on.
 */

test('the dialog starts on Vigilance by default', async ({ world, page }) => {
  const encounter = await world.encounter({
    combatants: [
      { actor: 'character' },
    ],
  });

  const pools = await api.rollInitiative(page, encounter.combat);

  expect(pools.checked, 'the rule names Vigilance, so that is where it opens').toBe('Vigilance');
});

test('setting the rule to Cool starts the dialog there instead', async ({ world, page }) => {
  await world.setSetting('initiativeRule', 'c');

  const encounter = await world.encounter({
    combatants: [
      { actor: 'character' },
    ],
  });

  const pools = await api.rollInitiative(page, encounter.combat, { skill: 'Cool' });

  expect(pools.checked, 'the rule names Cool, so that is where it opens').toBe('Cool');
  expect(pools.offered, 'and Vigilance is still on offer').toContain('Vigilance');
});

test('the rule does not stop the other pool being chosen', async ({ world, page }) => {
  await world.setSetting('initiativeRule', 'c');

  const encounter = await world.encounter({
    combatants: [
      { actor: 'character' },
    ],
  });

  const pools = await api.rollInitiative(page, encounter.combat, { skill: 'Vigilance' });
  const combatants = await api.readCombatants(page, encounter.combat);

  expect(pools.checked, 'the dialog still opened on the rule').toBe('Cool');
  expect(combatants[0].initiative, 'the other pool rolled all the same').not.toBeNull();
  expect(await api.readLastChatFlavor(page), 'and it is the one that rolled').toContain('Vigilance');
});
