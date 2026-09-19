import { test, expect } from '../../support/fixtures';
import * as api from '../../support/api';
import * as tracker from '../../support/pages/combat-tracker';

/**
 * The other two ways out of an encounter.
 */

test('removing a combatant takes the last slot of its side with it', async ({ world, page }) => {
  await world.setSetting('removeCombatantAction', 'last_slot');

  const encounter = await world.encounter({
    combatants: [
      { actor: 'character' },
      { actor: 'character' },
      { actor: 'character' },
    ],
    roll: true,
  });

  await api.openCombatTracker(page);
  await api.removeCombatant(page, encounter.combat, encounter.combatants[1]);

  const combatants = await api.readCombatants(page, encounter.combat);

  // `combatant_only` would leave a placeholder and keep the side at three
  await expect(tracker.slots(page), 'the side is one slot smaller').toHaveCount(2);
  expect(
    combatants.map((c) => c.id),
    'and the combatant is out of the encounter'
  ).not.toContain(encounter.combatants[1]);
});

test.fixme('the claim on a removed last slot moves to its replacement', async ({ world, page }) => {
  await world.setSetting('removeCombatantAction', 'last_slot');

  const encounter = await world.encounter({
    combatants: [
      { actor: 'character' },
      { actor: 'character' },
      { actor: 'character' },
    ],
    roll: true,
  });

  await api.openCombatTracker(page);

  const order = await api.readTurnOrder(page, encounter.combat);
  await api.setTurn(page, encounter.combat, order.length - 1);
  await api.controlToken(page, encounter.scene, encounter.tokens[0]);
  await tracker.claimControl(page).click();
  await expect(tracker.claimedSlots(page), 'the last slot is claimed').toHaveCount(1);

  await api.removeCombatant(page, encounter.combat, encounter.combatants[1]);

  // FIXME: #2304
  const combatants = await api.readCombatants(page, encounter.combat);
  const claims = await api.readSlotClaims(page, encounter.combat);

  expect(
    Object.values(claims),
    'the claim still belongs to the combatant that made it'
  ).toEqual([encounter.combatants[0]]);
  expect(
    combatants.map((c) => c.id),
    'and points at a slot that is still in the encounter'
  ).toContain(Object.keys(claims)[0]);
});

test('removing a combatant offers the choice of both when set to prompt', async ({ world, page }) => {
  await world.setSetting('removeCombatantAction', 'prompt');

  const encounter = await world.encounter({
    combatants: [
      { actor: 'character' },
      { actor: 'character' },
      { actor: 'character' },
    ],
    roll: true,
  });

  await api.openCombatTracker(page);
  await api.removeCombatant(page, encounter.combat, encounter.combatants[1], { settle: false });

  await api.waitForDialog(page, { title: 'Removing Combatant' });

  expect(
    await api.readDialogButtons(page),
    'both ways out, and a way back'
  ).toEqual(['Remove Combatant', 'Remove Last Slot', 'Cancel']);

  await api.answerDialog(page, 'one');
  await api.settleRoster(page, encounter.combat);

  await expect(tracker.slots(page), 'the answer given keeps the side whole').toHaveCount(3);
});

test('declining the prompt leaves the encounter as it was', async ({ world, page }) => {
  await world.setSetting('removeCombatantAction', 'prompt');

  const encounter = await world.encounter({
    combatants: [
      { actor: 'character' },
      { actor: 'character' },
      { actor: 'character' },
    ],
    roll: true,
  });

  await api.openCombatTracker(page);
  await api.controlToken(page, encounter.scene, encounter.tokens[0]);
  await tracker.claimControl(page).click();
  await expect(tracker.claimedSlots(page), 'a claim to leave alone').toHaveCount(1);

  const before = await api.readSlotClaims(page, encounter.combat);

  await api.removeCombatant(page, encounter.combat, encounter.combatants[1], { settle: false });
  await api.waitForDialog(page, { title: 'Removing Combatant' });
  await api.answerDialog(page, 'three');

  const combatants = await api.readCombatants(page, encounter.combat);

  await expect(tracker.slots(page), 'every slot is still there').toHaveCount(3);
  expect(combatants.map((c) => c.id), 'so is the combatant').toContain(encounter.combatants[1]);
  expect(
    await api.readSlotClaims(page, encounter.combat),
    'and the claim is untouched'
  ).toEqual(before);
});

test('#2021 a combatant removed while the current slot is claimed takes a slot with it', async ({ world, page }) => {
  await world.setSetting('removeCombatantAction', 'last_slot');

  const encounter = await world.encounter({
    combatants: [
      { actor: 'character' },
      { actor: 'character' },
      { actor: 'character' },
    ],
    roll: true,
  });

  await api.openCombatTracker(page);
  await api.controlToken(page, encounter.scene, encounter.tokens[0]);
  await tracker.claimControl(page).click();
  await expect(tracker.claimedSlots(page), 'the current slot is taken').toHaveCount(1);

  await api.removeCombatant(page, encounter.combat, encounter.combatants[1]);

  const combatants = await api.readCombatants(page, encounter.combat);
  
  await expect(tracker.slots(page), 'the side is one slot smaller').toHaveCount(2);
  expect(
    combatants.map((c) => c.id),
    'and the combatant is out of the encounter'
  ).not.toContain(encounter.combatants[1]);
});
