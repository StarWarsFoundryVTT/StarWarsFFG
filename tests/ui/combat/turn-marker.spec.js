import { test, expect } from '../../support/fixtures';
import * as api from '../../support/api';
import * as tracker from '../../support/pages/combat-tracker';

/**
 * The one place the slot model reaches the canvas.
 */

test('the turn marker follows the claimant of a slot rather than its owner', async ({ world, page }) => {
  const trackerConfig = await api.readSetting(page, 'combatTrackerConfig', 'core') ?? {};
  await world.setSetting(
    'combatTrackerConfig',
    { ...trackerConfig, turnMarker: { ...trackerConfig.turnMarker, enabled: true } },
    'core',
  );

  const encounter = await world.encounter({
    combatants: [
      { actor: 'character' },
      { actor: 'character' },
    ],
    roll: true,
  });

  await api.openCombatTracker(page);

  const order = await api.readTurnOrder(page, encounter.combat);
  await api.setTurn(page, encounter.combat, order.indexOf(encounter.combatants[0]));
  await api.controlToken(page, encounter.scene, encounter.tokens[1]);
  await tracker.claimControl(page).click();

  await expect(tracker.claimedSlots(page), 'claimed by the other combatant').toHaveCount(1);
  await expect.poll(
    () => api.readTurnMarkers(page),
    { message: 'the marker is on the claimant, not the slot it belongs to' }
  ).toEqual([encounter.tokens[1]]);
});
