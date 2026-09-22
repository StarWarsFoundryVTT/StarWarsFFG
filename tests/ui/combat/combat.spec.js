import { test, expect } from '../../support/fixtures';
import * as api from '../../support/api';
import * as tracker from '../../support/pages/combat-tracker';

/**
 * Initiative, slots and the combat tracker.
 */

test('rolling initiative produces one slot per combatant', async ({ world, page }) => {
  const encounter = await world.encounter({
    combatants: [
      { actor: 'character' },
    ],
  });

  await api.rollInitiative(page, encounter.combat);
  await api.openCombatTracker(page);

  await expect(tracker.slots(page), 'the tracker lists the slot').toHaveCount(1);
});

test('a slot carries the initiative that was rolled for it', async ({ world, page }) => {
  const encounter = await world.encounter({
    combatants: [
      { actor: 'character', disposition: 1 },
      { actor: 'character', disposition: -1 },
    ],
  });

  await api.rollInitiative(page, encounter.combat, { ids: [encounter.combatants[0]] });
  await api.openCombatTracker(page);

  const combatants = await api.readCombatants(page, encounter.combat);
  const rolled = combatants.find((c) => c.id === encounter.combatants[0]);
  const other = combatants.find((c) => c.id === encounter.combatants[1]);
  expect(rolled.initiative, 'the combatant rolled for has a value').not.toBeNull();
  expect(other.initiative, 'the one not rolled for has none').toBeNull();
  expect(
    await tracker.initiativeOf(tracker.slotsFor(page, 'Enemy')),
    'nor does its slot'
  ).toBeNull();
  expect(
    await tracker.initiativeOf(tracker.slotsFor(page, 'Friendly')),
    'the value landed on the slot of the combatant it was rolled for'
  ).toBe(rolled.initiative);
});

test('slots are grouped by disposition, not by actor', async ({ world, page }) => {
  const encounter = await world.encounter({
    combatants: [
      { actor: 'character', disposition: 1 },
      { actor: 'character', disposition: 1 },
      { actor: 'character', disposition: -1 },
    ],
    roll: true,
  });

  await api.openCombatTracker(page);

  await expect(tracker.slotsFor(page, 'Friendly'), 'two on a side share one group').toHaveCount(2);
  await expect(tracker.slotsFor(page, 'Enemy'), 'the other side has its own').toHaveCount(1);
  await expect(tracker.slotsFor(page, 'Neutral'), 'a side with nobody on it has none').toHaveCount(0);
});

test('a combatant claiming a slot removes it from the pool of unclaimed ones', async ({ world, page }) => {
  const encounter = await world.encounter({
    combatants: [
      { actor: 'character' },
      { actor: 'character' },
    ],
    roll: true,
  });

  await api.controlToken(page, encounter.scene, encounter.tokens[0]);
  await api.openCombatTracker(page);
  await tracker.claimControl(page).click();

  await expect(tracker.claimedSlots(page), 'the slot leaves the pool').toHaveCount(1);
  await expect(tracker.unclaimedSlots(page), 'the other is still in it').toHaveCount(1);

  expect(
    Object.values(await api.readSlotClaims(page, encounter.combat)),
    'the claim is credited to the combatant whose token made it'
  ).toEqual([encounter.combatants[0]]);
});

test('unclaiming a slot returns it to the pool', async ({ world, page }) => {
  const encounter = await world.encounter({
    combatants: [
      { actor: 'character' },
      { actor: 'character' },
    ],
    roll: true,
  });

  await api.controlToken(page, encounter.scene, encounter.tokens[0]);
  await api.openCombatTracker(page);
  await tracker.claimControl(page).click();
  await expect(tracker.claimedSlots(page), 'claimed to begin with').toHaveCount(1);

  const [slotId] = Object.keys(await api.readSlotClaims(page, encounter.combat));
  await api.unclaimSlot(page, encounter.combat, slotId);

  await expect(tracker.claimedSlots(page), 'nothing is claimed').toHaveCount(0);
  await expect(tracker.unclaimedSlots(page), 'both slots are back in the pool').toHaveCount(2);
  await expect(tracker.claimControl(page), 'and one can be claimed again').toHaveCount(1);
});

test('a combatant cannot claim a slot belonging to another side', async ({ world, page }) => {
  const encounter = await world.encounter({
    combatants: [
      { actor: 'character', disposition: 1 },
      { actor: 'character', disposition: -1 },
    ],
    roll: true,
  });

  await api.openCombatTracker(page);

  // whose turn it is decides which slot is on offer, so the wrong side is worked out rather than assumed
  const side = await tracker.claimableSlot(page).getAttribute('data-disposition');
  const [mine, theirs] = side === 'Friendly' ? encounter.tokens : [...encounter.tokens].reverse();

  await api.controlToken(page, encounter.scene, theirs);
  await tracker.claimControl(page).click();

  await expect(tracker.claimedSlots(page), 'the other side is refused').toHaveCount(0);
  expect(await api.readSlotClaims(page, encounter.combat), 'and nothing is recorded').toEqual({});

  await api.controlToken(page, encounter.scene, mine);
  await tracker.claimControl(page).click();

  await expect(tracker.claimedSlots(page), 'its own side is not').toHaveCount(1);
});

test('a new round starts with every slot unclaimed', async ({ world, page }) => {
  const encounter = await world.encounter({
    combatants: [
      { actor: 'character' },
      { actor: 'character' },
    ],
    roll: true,
  });

  await api.controlToken(page, encounter.scene, encounter.tokens[0]);
  await api.openCombatTracker(page);
  await tracker.claimControl(page).click();
  await expect(tracker.claimedSlots(page), 'claimed during the first round').toHaveCount(1);

  await api.nextRound(page, encounter.combat);

  await expect(tracker.claimedSlots(page), 'the new round starts with none').toHaveCount(0);
  await expect(tracker.unclaimedSlots(page), 'every slot is back in the pool').toHaveCount(2);
  expect(
    Object.values(await api.readSlotClaims(page, encounter.combat, 1)),
    'the round before it keeps its own claims'
  ).toEqual([encounter.combatants[0]]);
});

test('an added combatant gets a slot without disturbing existing claims', async ({ world, page }) => {
  const encounter = await world.encounter({
    combatants: [
      { actor: 'character' },
      { actor: 'character' },
    ],
    roll: true,
  });

  await api.controlToken(page, encounter.scene, encounter.tokens[0]);
  await api.openCombatTracker(page);
  await tracker.claimControl(page).click();
  await expect(tracker.claimedSlots(page), 'claimed before the newcomer arrives').toHaveCount(1);

  await world.addCombatant(encounter, { actor: 'character' });

  await expect(tracker.slots(page), 'the newcomer gets one of its own').toHaveCount(3);
  await expect(tracker.claimedSlots(page), 'the claim already made still stands').toHaveCount(1);
  expect(
    Object.values(await api.readSlotClaims(page, encounter.combat)),
    'and is still credited to the same combatant'
  ).toEqual([encounter.combatants[0]]);
});

test('removing a combatant leaves a generic slot behind for its side', async ({ world, page }) => {
  const encounter = await world.encounter({
    combatants: [
      { actor: 'character' },
      { actor: 'character' },
    ],
    roll: true,
  });

  await api.openCombatTracker(page);
  await api.removeCombatant(page, encounter.combat, encounter.combatants[1]);

  const combatants = await api.readCombatants(page, encounter.combat);

  await expect(tracker.slotsFor(page, 'Friendly'), 'the side keeps its slots').toHaveCount(2);
  expect(combatants.filter((c) => c.generic), 'one of them is now generic').toHaveLength(1);
  expect(combatants.map((c) => c.id), 'the combatant is gone').not.toContain(encounter.combatants[1]);
});

test('removing a combatant that had claimed a slot leaves one behind too', async ({ world, page }) => {
  const encounter = await world.encounter({
    combatants: [
      { actor: 'character' },
      { actor: 'character' },
    ],
    roll: true,
  });

  await api.controlToken(page, encounter.scene, encounter.tokens[1]);
  await api.openCombatTracker(page);
  await tracker.claimControl(page).click();
  await expect(tracker.claimedSlots(page), 'claimed before being removed').toHaveCount(1);

  await api.removeCombatant(page, encounter.combat, encounter.combatants[1]);

  const combatants = await api.readCombatants(page, encounter.combat);

  await expect(tracker.slotsFor(page, 'Friendly'), 'the side keeps its slots').toHaveCount(2);
  expect(combatants.filter((c) => c.generic), 'one of them is now generic').toHaveLength(1);
  expect(combatants.map((c) => c.id), 'the combatant is gone').not.toContain(encounter.combatants[1]);
});

test('a token toggled into combat from its HUD joins the encounter', async ({ world, page }) => {
  const encounter = await world.encounter({
    combatants: [
      { actor: 'character' },
    ],
    roll: true,
  });
  const latecomer = await world.addToken(encounter, { actor: 'character' });

  await api.openCombatTracker(page);
  await api.toggleTokenCombat(page, encounter.scene, latecomer);

  const combatants = await api.readCombatants(page, encounter.combat);

  expect(combatants.map((c) => c.tokenId), 'the token is in the encounter').toContain(latecomer);
  await expect(tracker.slots(page), 'and has a slot of its own').toHaveCount(2);
});

test('a token toggled out of combat leaves the same slot behind as the tracker does', async ({ world, page }) => {
  const encounter = await world.encounter({
    combatants: [
      { actor: 'character' },
      { actor: 'character' },
    ],
    roll: true,
  });

  await api.openCombatTracker(page);
  await api.toggleTokenCombat(page, encounter.scene, encounter.tokens[1]);

  const combatants = await api.readCombatants(page, encounter.combat);

  await expect(tracker.slotsFor(page, 'Friendly'), 'the side keeps its slots').toHaveCount(2);
  expect(combatants.filter((c) => c.generic), 'one of them is now generic').toHaveLength(1);
  expect(combatants.map((c) => c.tokenId), 'the token is out').not.toContain(encounter.tokens[1]);
});

test('the two ways in produce the same encounter', async ({ world, page }) => {
  const encounter = await world.encounter({
    combatants: [
      { actor: 'character' },
    ],
    roll: true,
  });
  const bystander = await world.addToken(encounter, { actor: 'character' });

  await api.openCombatTracker(page);
  const enrolled = await world.addCombatant(encounter, { actor: 'character' });
  await api.toggleTokenCombat(page, encounter.scene, bystander);

  const combatants = await api.readCombatants(page, encounter.combat);
  const viaTracker = combatants.find((c) => c.id === enrolled);
  const viaCanvas = combatants.find((c) => c.tokenId === bystander);

  await expect(tracker.slotsFor(page, 'Friendly'), 'a slot each').toHaveCount(3);
  expect([viaTracker.generic, viaCanvas.generic], 'neither is a placeholder').toEqual([false, false]);
  expect(
    { generic: viaCanvas.generic, hidden: viaCanvas.hidden, initiative: viaCanvas.initiative },
    'and the two arrivals are alike'
  ).toEqual({ generic: viaTracker.generic, hidden: viaTracker.hidden, initiative: viaTracker.initiative });
});

test('a slot added by hand takes the disposition and initiative it was given', async ({ world, page }) => {
  const encounter = await world.encounter({
    combatants: [
      { actor: 'character' },
    ],
    roll: true,
  });

  await api.openCombatTracker(page);
  await tracker.addSlot(page, { side: 'Enemy', initiative: 7 });

  await expect(tracker.slotsFor(page, 'Enemy'), 'a slot on the side it was given').toHaveCount(1);
  expect(
    await tracker.initiativeOf(tracker.slotsFor(page, 'Enemy')),
    'holding the initiative it was given'
  ).toBe(7);

  const combatants = await api.readCombatants(page, encounter.combat);
  expect(combatants.filter((c) => c.generic), 'and nobody behind it').toHaveLength(1);
});

test('a slot added by hand can be claimed like any other', async ({ world, page }) => {
  const encounter = await world.encounter({
    combatants: [
      { actor: 'character' },
    ],
    roll: true,
  });

  await api.openCombatTracker(page);
  // above of anything a die could roll
  await tracker.addSlot(page, { side: 'Friendly', initiative: 10 });
  await api.setTurn(page, encounter.combat, 0);

  await api.controlToken(page, encounter.scene, encounter.tokens[0]);
  await tracker.claimControl(page).click();

  await expect(tracker.claimedSlots(page), 'the hand-added slot is taken').toHaveCount(1);
  await expect(tracker.unclaimedSlots(page), 'the rolled one is left alone').toHaveCount(1);

  const combatants = await api.readCombatants(page, encounter.combat);
  const [placeholder] = combatants.filter((c) => c.generic);
  const claims = await api.readSlotClaims(page, encounter.combat);

  expect(claims[placeholder.id], 'by the combatant that took it').toBe(encounter.combatants[0]);
});

test('a claim survives the combatant it was made for being removed', async ({ world, page }) => {
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
  await expect(tracker.claimedSlots(page), 'claimed before the removal').toHaveCount(1);

  await api.removeCombatant(page, encounter.combat, encounter.combatants[0]);

  await expect(tracker.claimedSlots(page), 'the claim is still there').toHaveCount(1);

  const combatants = await api.readCombatants(page, encounter.combat);
  const [placeholder] = combatants.filter((c) => c.generic);
  const claims = await api.readSlotClaims(page, encounter.combat);

  expect(claims[placeholder.id], 'moved onto the slot that replaced it').toBe(encounter.combatants[1]);
});

test('a claim survives its combatant being toggled out of combat from the canvas', async ({ world, page }) => {
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
  await expect(tracker.claimedSlots(page), 'claimed before the removal').toHaveCount(1);

  // the same removal as the tracker's, reached by the token's own HUD instead
  await api.toggleTokenCombat(page, encounter.scene, encounter.tokens[0]);

  await expect(tracker.claimedSlots(page), 'the claim is still there').toHaveCount(1);

  const combatants = await api.readCombatants(page, encounter.combat);
  const [placeholder] = combatants.filter((c) => c.generic);
  const claims = await api.readSlotClaims(page, encounter.combat);

  expect(claims[placeholder.id], 'moved onto the slot that replaced it').toBe(encounter.combatants[1]);
});

test('removing a slot from the tracker takes its claimant out of the encounter', async ({ world, page }) => {
  const encounter = await world.encounter({
    combatants: [
      { actor: 'character' },
      { actor: 'character' },
    ],
    roll: true,
  });

  await api.openCombatTracker(page);
  await api.controlToken(page, encounter.scene, encounter.tokens[1]);
  await tracker.claimControl(page).click();
  await expect(tracker.claimedSlots(page), 'claimed before the removal').toHaveCount(1);

  // it removes whoever claimed the slot, not whoever the slot belongs to
  await tracker.chooseSlotMenuEntry(page, tracker.claimedSlots(page), tracker.SLOT_MENU.removeCombatant);
  await api.settleRoster(page, encounter.combat);

  const combatants = await api.readCombatants(page, encounter.combat);

  expect(combatants.map((c) => c.id), 'the claimant is out').not.toContain(encounter.combatants[1]);
  expect(combatants.map((c) => c.id), 'the slot it claimed is not').toContain(encounter.combatants[0]);
});

test('a slot cannot be removed while it is claimed', async ({ world, page }) => {
  const encounter = await world.encounter({
    combatants: [
      { actor: 'character' },
      { actor: 'character' },
    ],
    roll: true,
  });

  await api.openCombatTracker(page);
  // A spare slot, so the side could afford to lose one and the claim is the only thing in the way
  await tracker.addSlot(page, { side: 'Friendly', initiative: 99 });
  await api.setTurn(page, encounter.combat, 0);
  await api.controlToken(page, encounter.scene, encounter.tokens[0]);
  await tracker.claimControl(page).click();
  await expect(tracker.claimedSlots(page), 'claimed before the attempt').toHaveCount(1);

  await tracker.chooseSlotMenuEntry(page, tracker.claimedSlots(page), tracker.SLOT_MENU.removeSlot);
  await api.settleRoster(page, encounter.combat);

  await expect(tracker.slots(page), 'the slot is still there').toHaveCount(3);
  expect(
    Object.values(await api.readSlotClaims(page, encounter.combat)),
    'and still claimed by the same combatant'
  ).toEqual([encounter.combatants[0]]);
});

test('a side keeps at least as many slots as it has combatants', async ({ world, page }) => {
  const encounter = await world.encounter({
    combatants: [
      { actor: 'character' },
      { actor: 'character' },
    ],
    roll: true,
  });

  await api.openCombatTracker(page);
  await tracker.chooseSlotMenuEntry(page, tracker.slots(page).first(), tracker.SLOT_MENU.removeSlot);
  await api.settleRoster(page, encounter.combat);

  await expect(tracker.slots(page), 'two combatants need two slots').toHaveCount(2);

  await tracker.addSlot(page, { side: 'Friendly', initiative: 1 });
  await expect(tracker.slots(page), 'one more than the side needs').toHaveCount(3);

  await tracker.chooseSlotMenuEntry(page, tracker.slots(page).last(), tracker.SLOT_MENU.removeSlot);
  await api.settleRoster(page, encounter.combat);

  await expect(tracker.slots(page), 'the spare one goes').toHaveCount(2);
});

test('a generic slot is deleted outright rather than replaced', async ({ world, page }) => {
  const encounter = await world.encounter({
    combatants: [
      { actor: 'character' },
      { actor: 'character' },
    ],
    roll: true,
  });

  await api.openCombatTracker(page);
  await tracker.addSlot(page, { side: 'Friendly', initiative: 1 });
  await expect(tracker.slots(page), 'a spare to take away').toHaveCount(3);

  await tracker.chooseSlotMenuEntry(page, tracker.slots(page).last(), tracker.SLOT_MENU.removeSlot);
  await api.settleRoster(page, encounter.combat);

  await expect(tracker.slots(page), 'the side is back to one each').toHaveCount(2);

  const combatants = await api.readCombatants(page, encounter.combat);

  expect(combatants.filter((c) => c.generic), 'and nothing stood in for it').toHaveLength(0);
});

// permutations

test('claiming, unclaiming and claiming again leaves a single claim', async ({ world, page }) => {
  const encounter = await world.encounter({
    combatants: [
      { actor: 'character' },
      { actor: 'character' },
    ],
    roll: true,
  });

  await api.openCombatTracker(page);
  await api.controlToken(page, encounter.scene, encounter.tokens[0]);

  await tracker.claimControl(page).click();
  await expect(tracker.claimedSlots(page), 'claimed').toHaveCount(1);

  await tracker.chooseSlotMenuEntry(page, tracker.claimedSlots(page), tracker.SLOT_MENU.unclaim);
  await expect(tracker.claimedSlots(page), 'given up again').toHaveCount(0);

  await tracker.claimControl(page).click();

  await expect(tracker.claimedSlots(page), 'and taken a second time').toHaveCount(1);
  expect(
    Object.values(await api.readSlotClaims(page, encounter.combat)),
    'the round holds one claim, not the wreckage of three'
  ).toEqual([encounter.combatants[0]]);
});

test('a slot inserted ahead of the current one does not change whose turn it is', async ({ world, page }) => {
  const encounter = await world.encounter({
    combatants: [
      { actor: 'character' },
      { actor: 'character' },
    ],
    roll: true,
  });

  await api.openCombatTracker(page);

  const before = await api.readCurrentSlot(page, encounter.combat);
  await tracker.addSlot(page, { side: 'Friendly', initiative: 99 });

  const order = await api.readTurnOrder(page, encounter.combat);
  const combatants = await api.readCombatants(page, encounter.combat);
  const [placeholder] = combatants.filter((c) => c.generic);

  expect(order[0], 'the new slot sorts to the front').toBe(placeholder.id);
  expect(
    await api.readCurrentSlot(page, encounter.combat),
    'and the same slot is still up'
  ).toBe(before);
});

test('a combatant added and then removed leaves its slot behind', async ({ world, page }) => {
  const encounter = await world.encounter({
    combatants: [
      { actor: 'character' },
      { actor: 'character' },
    ],
    roll: true,
  });

  await api.openCombatTracker(page);

  const latecomer = await world.addCombatant(encounter, { actor: 'character' });
  await expect(tracker.slots(page), 'three in the fight, three slots').toHaveCount(3);

  await api.removeCombatant(page, encounter.combat, latecomer);

  await expect(tracker.slots(page), 'the side keeps the room it made').toHaveCount(3);

  const combatants = await api.readCombatants(page, encounter.combat);

  expect(combatants.map((c) => c.id), 'the latecomer is gone').not.toContain(latecomer);
  expect(combatants.filter((c) => c.generic), 'a placeholder stands where it was').toHaveLength(1);
});

test('a slot added by hand and then removed leaves the turn and claims where they were', async ({ world, page }) => {
  const encounter = await world.encounter({
    combatants: [
      { actor: 'character' },
      { actor: 'character' },
    ],
    roll: true,
  });

  await api.openCombatTracker(page);
  await api.controlToken(page, encounter.scene, encounter.tokens[0]);
  await tracker.claimControl(page).click();
  await expect(tracker.claimedSlots(page), 'something to disturb').toHaveCount(1);

  const current = await api.readCurrentSlot(page, encounter.combat);
  const claims = await api.readSlotClaims(page, encounter.combat);

  await tracker.addSlot(page, { side: 'Friendly', initiative: 99 });
  await tracker.chooseSlotMenuEntry(page, tracker.slots(page).first(), tracker.SLOT_MENU.removeSlot);
  await api.settleRoster(page, encounter.combat);

  await expect(tracker.slots(page), 'the side is back to what it was').toHaveCount(2);
  expect(
    await api.readCurrentSlot(page, encounter.combat),
    'the same slot is still up'
  ).toBe(current);
  expect(
    await api.readSlotClaims(page, encounter.combat),
    'and the claim is untouched'
  ).toEqual(claims);
});

test('claims made in consecutive rounds are recorded against their own round', async ({ world, page }) => {
  const encounter = await world.encounter({
    combatants: [
      { actor: 'character' },
      { actor: 'character' },
    ],
    roll: true,
  });

  await api.openCombatTracker(page);
  await api.controlToken(page, encounter.scene, encounter.tokens[0]);
  await tracker.claimControl(page).click();
  await expect(tracker.claimedSlots(page), 'claimed in the first round').toHaveCount(1);

  await api.nextRound(page, encounter.combat);

  await api.controlToken(page, encounter.scene, encounter.tokens[1]);
  await tracker.claimControl(page).click();
  await expect(tracker.claimedSlots(page), 'and again in the second').toHaveCount(1);

  expect(
    Object.values(await api.readSlotClaims(page, encounter.combat, 1)),
    'the first round keeps the claim made in it'
  ).toEqual([encounter.combatants[0]]);
  expect(
    Object.values(await api.readSlotClaims(page, encounter.combat, 2)),
    'and the second its own'
  ).toEqual([encounter.combatants[1]]);
});

test('removing a combatant from a side holding an unclaimed generic slot strands nothing', async ({ world, page }) => {
  const encounter = await world.encounter({
    combatants: [
      { actor: 'character' },
      { actor: 'character' },
    ],
    roll: true,
  });

  await api.openCombatTracker(page);
  await tracker.addSlot(page, { side: 'Friendly', initiative: 1 });
  await expect(tracker.slots(page), 'a spare standing before the removal').toHaveCount(3);

  await api.removeCombatant(page, encounter.combat, encounter.combatants[1]);

  await expect(tracker.slots(page), 'the spare and the replacement both stand').toHaveCount(3);

  const combatants = await api.readCombatants(page, encounter.combat);
  const listed = await tracker.slotIds(page);

  expect(combatants.filter((c) => c.generic), 'two placeholders now').toHaveLength(2);
  expect(
    listed.filter((id) => !combatants.some((c) => c.id === id)),
    'and every slot listed has a combatant behind it'
  ).toEqual([]);
});

test('a claim made after the roster changed survives the round turning', async ({ world, page }) => {
  const encounter = await world.encounter({
    combatants: [
      { actor: 'character' },
      { actor: 'character' },
    ],
    roll: true,
  });

  await api.openCombatTracker(page);

  await api.removeCombatant(page, encounter.combat, encounter.combatants[1]);
  await api.controlToken(page, encounter.scene, encounter.tokens[0]);
  await tracker.claimControl(page).click();
  await expect(tracker.claimedSlots(page), 'claimed after the roster changed').toHaveCount(1);

  const claimed = await api.readSlotClaims(page, encounter.combat);

  await api.nextRound(page, encounter.combat);

  await expect(tracker.claimedSlots(page), 'the new round shows none').toHaveCount(0);
  expect(
    await api.readSlotClaims(page, encounter.combat, 1),
    'the round it was made in kept it'
  ).toEqual(claimed);
  expect(
    await api.readSlotClaims(page, encounter.combat, 2),
    'and the new one starts empty'
  ).toEqual({});
});

// turns and rounds

test('advancing a turn moves the claim link to the next slot', async ({ world, page }) => {
  const encounter = await world.encounter({
    combatants: [
      { actor: 'character' },
      { actor: 'character' },
    ],
    roll: true,
  });

  await api.openCombatTracker(page);

  const first = await api.readCurrentSlot(page, encounter.combat);
  expect(await tracker.claimableSlotId(page), 'the link sits on the slot whose turn it is').toBe(first);

  await tracker.control(page, 'nextTurn').click();

  // The control updates the combat rather than waiting on it, so both reads are polled.
  await expect.poll(
    () => api.readCurrentSlot(page, encounter.combat),
    { message: 'the turn moved on' }
  ).not.toBe(first);

  const second = await api.readCurrentSlot(page, encounter.combat);
  await expect.poll(
    () => tracker.claimableSlotId(page),
    { message: 'and the link moved with it' }
  ).toBe(second);
});

test("stepping back a round shows that round's claims again", async ({ world, page }) => {
  const encounter = await world.encounter({
    combatants: [
      { actor: 'character' },
      { actor: 'character' },
    ],
    roll: true,
  });

  await api.openCombatTracker(page);
  await api.controlToken(page, encounter.scene, encounter.tokens[0]);
  await tracker.claimControl(page).click();
  await expect(tracker.claimedSlots(page), 'claimed in the first round').toHaveCount(1);

  const claimed = await api.readSlotClaims(page, encounter.combat);

  await tracker.control(page, 'nextRound').click();
  await expect(tracker.claimedSlots(page), 'the second round shows none').toHaveCount(0);

  await tracker.control(page, 'previousRound').click();

  await expect(tracker.claimedSlots(page), 'stepping back shows it again').toHaveCount(1);
  await expect.poll(
    () => api.readSlotClaims(page, encounter.combat),
    { message: 'and it is the claim that was made there' }
  ).toEqual(claimed);
});

test('ending the encounter leaves no slots behind', async ({ world, page }) => {
  const encounter = await world.encounter({
    combatants: [
      { actor: 'character' },
      { actor: 'character' },
    ],
    roll: true,
  });

  await api.openCombatTracker(page);
  await api.controlToken(page, encounter.scene, encounter.tokens[0]);
  await tracker.claimControl(page).click();
  await expect(tracker.claimedSlots(page), 'a claim to leave behind').toHaveCount(1);

  await tracker.control(page, 'endCombat').click();
  await api.confirmDialog(page);

  await expect(tracker.slots(page), 'the tracker empties').toHaveCount(0);
  await expect.poll(
    () => api.combatExists(page, encounter.combat),
    { message: 'and the encounter is gone with it' }
  ).toBe(false);
});

// initiative

test('initiative can be rolled from Cool rather than Vigilance', async ({ world, page }) => {
  const encounter = await world.encounter({
    combatants: [
      { actor: 'character' },
    ],
  });

  await api.rollInitiative(page, encounter.combat, { skill: 'Cool' });

  const combatants = await api.readCombatants(page, encounter.combat);

  expect(combatants[0].initiative, 'it rolled').not.toBeNull();
  expect(await api.readLastChatFlavor(page), 'from the pool it was asked for').toContain('Cool');
});

test('a skill flagged useForInitiative is offered alongside Vigilance and Cool', async ({ world, page }) => {
  const encounter = await world.encounter({
    combatants: [
      {
        actor: 'character',
        actorOverrides: {
          skills: { 'Perception': { rank: 2, useForInitiative: true } },
        },
      },
    ],
  });

  const pools = await api.rollInitiative(page, encounter.combat, { skill: 'Perception' });

  expect(pools.offered, 'the flagged skill, then the two that always stand').toEqual([
    'Perception',
    'Vigilance',
    'Cool',
  ]);
  expect(await api.readLastChatFlavor(page), 'and it can be rolled from').toContain('Perception');
});

test("a slot's initiative can be corrected by hand", async ({ world, page }) => {
  const encounter = await world.encounter({
    combatants: [
      { actor: 'character' },
      { actor: 'character' },
    ],
    roll: true,
  });

  await api.openCombatTracker(page);

  const [slotId] = await tracker.slotIds(page);
  await tracker.setSlotInitiative(page, tracker.slots(page).first(), 5);

  await expect.poll(
    async () => (await api.readCombatants(page, encounter.combat)).find((c) => c.id === slotId).initiative,
    { message: 'the slot holds the value it was given' }
  ).toBe(5);
  expect(await tracker.initiatives(page), 'and the tracker shows it').toContain(5);
});

test('rolling again replaces the values rather than adding slots', async ({ world, page }) => {
  const encounter = await world.encounter({
    combatants: [
      { actor: 'character' },
      { actor: 'character' },
    ],
    roll: true,
  });

  await api.openCombatTracker(page);

  const before = await api.readTurnOrder(page, encounter.combat);
  await api.rollInitiative(page, encounter.combat);

  const after = await api.readTurnOrder(page, encounter.combat);
  const combatants = await api.readCombatants(page, encounter.combat);

  await expect(tracker.slots(page), 'still one slot each').toHaveCount(2);
  expect([...after].sort(), 'the same slots as before').toEqual([...before].sort());
  expect(combatants.filter((c) => c.initiative === null), 'each with a value').toHaveLength(0);
});

test('rolling for every combatant at once asks which pool once', async ({ world, page }) => {
  const encounter = await world.encounter({
    combatants: [
      { actor: 'character' },
      { actor: 'character' },
      { actor: 'character' },
    ],
  });

  await api.rollInitiative(page, encounter.combat);

  const combatants = await api.readCombatants(page, encounter.combat);

  expect(await api.openDialogs(page), 'one question, and it was answered').toEqual([]);
  expect(combatants.filter((c) => c.initiative === null), 'and all three rolled').toHaveLength(0);
});

test('rolling for the NPCs leaves the other slots unrolled', async ({ world, page }) => {
  const encounter = await world.encounter({
    combatants: [
      { actor: 'character' },
      { actor: 'minion', disposition: -1 },
      { actor: 'minion', disposition: -1 },
    ],
  });

  await api.rollInitiative(page, encounter.combat, { npcOnly: true });

  const combatants = await api.readCombatants(page, encounter.combat);
  const character = combatants.find((c) => c.tokenId === encounter.tokens[0]);
  const adversaries = combatants.filter((c) => c.tokenId !== encounter.tokens[0]);

  expect(adversaries.filter((c) => c.initiative === null), 'the minions rolled').toHaveLength(0);
  expect(character.initiative, 'and the character did not').toBeNull();
});

test('a vehicle rolls initiative on its pilot rather than on itself', async ({ world, page }) => {
  const pilot = await world.actor({
    actor: 'character',
    label: 'pilot',
    actorOverrides: {
      skills: { 'Perception': { rank: 2, useForInitiative: true } },
    },
  });

  const encounter = await world.encounter({
    combatants: [
      {
        actor: 'vehicle',
        flags: {
          starwarsffg: { crew: [{ role: 'Pilot', actor_id: await api.read(page, pilot, 'id') }] },
        },
      },
    ],
  });

  const pools = await api.rollInitiative(page, encounter.combat, { skill: 'Perception' });

  expect(pools.offered, 'the pools come from whoever is flying').toContain('Perception');
  expect(await api.readLastChatFlavor(page), 'and that is what it rolled').toContain('Perception');
});

test.fixme('a vehicle with no crew cannot roll initiative', async ({ world, page, consoleGuard }) => {
  const encounter = await world.encounter({
    combatants: [
      { actor: 'vehicle' },
    ],
  });

  // A ship has no skills of its own
  await expect(
    api.rollInitiative(page, encounter.combat),
    'the roll cannot be made'
  ).rejects.toThrow();

  const combatants = await api.readCombatants(page, encounter.combat);

  expect(combatants[0].initiative, 'nothing was recorded for it').toBeNull();
  // FIXME: #2302
  expect(await consoleGuard.notifications(), 'and the GM is told why').toContainEqual(
    expect.stringContaining('pilot role'),
  );
});

test('a secret token gets a slot on its own side', async ({ world, page }) => {
  const encounter = await world.encounter({
    combatants: [
      { actor: 'character' },
      { actor: 'minion', disposition: -2 },
    ],
    roll: true,
  });

  await api.openCombatTracker(page);

  await expect(tracker.slotsFor(page, 'Secret'), 'a side of its own').toHaveCount(1);
  await expect(tracker.slotsFor(page, 'Friendly'), 'and it joins nobody else').toHaveCount(1);
  await expect(tracker.slots(page), 'two slots between the two sides').toHaveCount(2);
});

// Regressions

test('#2020 a defeated combatant does not leave its side a slot short', async ({ world, page }) => {
  const encounter = await world.encounter({
    combatants: [
      { actor: 'character' },
      { actor: 'character' },
    ],
    roll: true,
  });

  await api.openCombatTracker(page);
  await api.setDefeated(page, encounter.combat, encounter.combatants[1]);

  const combatants = await api.readCombatants(page, encounter.combat);
  const fallen = combatants.find((c) => c.id === encounter.combatants[1]);

  expect(fallen.defeated, 'the combatant is marked defeated').toBe(true);
  expect(combatants.map((c) => c.id), 'and is still in the encounter').toContain(fallen.id);
  await expect(tracker.slots(page), 'its side keeps the slots it had').toHaveCount(2);
});

test.fixme("#2020 a defeated combatant's slot is marked unused", async ({ world, page }) => {
  const encounter = await world.encounter({
    combatants: [
      { actor: 'character' },
      { actor: 'character' },
    ],
    roll: true,
  });

  await api.openCombatTracker(page);
  await api.setDefeated(page, encounter.combat, encounter.combatants[1]);

  // FIXME: #2303
  await expect(tracker.unusedSlots(page), 'the slot nobody can take is marked').toHaveCount(1);
  await expect(tracker.slots(page), 'and it is still listed').toHaveCount(2);
});

test('#2022 a slot can be removed after its claim is given up', async ({ world, page }) => {
  const encounter = await world.encounter({
    combatants: [
      { actor: 'character' },
      { actor: 'character' },
    ],
    roll: true,
  });

  await api.openCombatTracker(page);
  await tracker.addSlot(page, { side: 'Friendly', initiative: 99 });
  await api.setTurn(page, encounter.combat, 0);
  await api.controlToken(page, encounter.scene, encounter.tokens[0]);
  await tracker.claimControl(page).click();
  await expect(tracker.claimedSlots(page), 'the spare is claimed').toHaveCount(1);

  await tracker.chooseSlotMenuEntry(page, tracker.claimedSlots(page), tracker.SLOT_MENU.removeSlot);
  await api.settleRoster(page, encounter.combat);
  await expect(tracker.slots(page), 'held, so it stays').toHaveCount(3);

  await tracker.chooseSlotMenuEntry(page, tracker.claimedSlots(page), tracker.SLOT_MENU.unclaim);
  await expect(tracker.claimedSlots(page), 'given up').toHaveCount(0);

  await tracker.chooseSlotMenuEntry(page, tracker.slots(page).first(), tracker.SLOT_MENU.removeSlot);
  await api.settleRoster(page, encounter.combat);
  await expect(tracker.slots(page), 'and now it goes').toHaveCount(2);

  const combatants = await api.readCombatants(page, encounter.combat);
  expect(
    combatants.map((c) => c.id),
    'both combatants are still in the fight'
  ).toEqual(expect.arrayContaining(encounter.combatants));
});

test('#2077 the tracker still renders after switching between two encounters', async ({ world, page }) => {
  const first = await world.encounter({
    combatants: [
      { actor: 'character' },
      { actor: 'character' },
    ],
    roll: true,
  });

  // a second encounter on the same scene, which takes over as the active one
  const second = world.track(await api.createCombat(page, first.scene, first.tokens));

  await api.openCombatTracker(page);
  await expect(tracker.slots(page), 'the encounter that took over draws').toHaveCount(2);

  await api.activateCombat(page, first.combat);

  await expect(tracker.slots(page), 'and the one it took over from draws again').toHaveCount(2);
  expect(await api.combatExists(page, second), 'with both still there').toBe(true);
});

test('a defeated combatant can still be removed from the encounter', async ({ world, page }) => {
  const encounter = await world.encounter({
    combatants: [
      { actor: 'character' },
      { actor: 'character' },
    ],
    roll: true,
  });

  await api.openCombatTracker(page);
  await api.setDefeated(page, encounter.combat, encounter.combatants[1]);
  await api.removeCombatant(page, encounter.combat, encounter.combatants[1]);

  const combatants = await api.readCombatants(page, encounter.combat);

  expect(
    combatants.map((c) => c.id),
    'the fallen combatant is out of the encounter'
  ).not.toContain(encounter.combatants[1]);
  expect(combatants.filter((c) => c.generic), 'a placeholder holds its slot').toHaveLength(1);
  await expect(tracker.slots(page), 'and the side keeps its slots').toHaveCount(2);
});

// Visibility and persistence
test('a hidden token still occupies a slot in the tracker', async ({ world, page }) => {
  const encounter = await world.encounter({
    combatants: [
      { actor: 'character' },
      { actor: 'minion', disposition: -1, hidden: true },
    ],
    roll: true,
  });

  await api.openCombatTracker(page);

  const combatants = await api.readCombatants(page, encounter.combat);
  const lurker = combatants.find((c) => c.tokenId === encounter.tokens[1]);

  expect(lurker.hidden, 'the token is hidden').toBe(true);
  await expect(tracker.slots(page), 'and still holds a slot').toHaveCount(2);
  await expect(tracker.slotsFor(page, 'Enemy'), 'on the side it belongs to').toHaveCount(1);
});

test('slots and claims survive a reload mid-encounter', async ({ world, page }) => {
  const encounter = await world.encounter({
    combatants: [
      { actor: 'character' },
      { actor: 'character' },
    ],
    roll: true,
  });

  await api.openCombatTracker(page);
  await api.controlToken(page, encounter.scene, encounter.tokens[0]);
  await tracker.claimControl(page).click();
  await expect(tracker.claimedSlots(page), 'claimed before the reload').toHaveCount(1);

  const claims = await api.readSlotClaims(page, encounter.combat);
  const order = await api.readTurnOrder(page, encounter.combat);

  await world.reload();
  await api.openCombatTracker(page);

  await expect(tracker.slots(page), 'the slots came back').toHaveCount(2);
  await expect(tracker.claimedSlots(page), 'one of them still claimed').toHaveCount(1);
  expect(await api.readSlotClaims(page, encounter.combat), 'by the same combatant').toEqual(claims);
  expect(await api.readTurnOrder(page, encounter.combat), 'and in the same order').toEqual(order);
});
