import { test, expect } from '../../support/fixtures';
import * as api from '../../support/api';

/**
 * Crew: who is aboard a vehicle, in which role, and what they roll.
 */

test('a crew member registered in a role appears on the vehicle', async ({ world, page }) => {
  const ship = await world.build({
    actor: 'vehicle',
  });
  const gunner = await world.build({
    actor: 'character',
  });
  const [role] = await api.readCrewRoles(page);

  expect(role.name, 'the world has a role to put someone in').toBeTruthy();

  await api.setCrewRoles(page, ship.actor, gunner.actor, [role.name]);

  const crew = await api.readCrew(page, ship.actor);

  expect(crew, 'one crew member aboard').toHaveLength(1);
  expect(crew[0].role, 'in the role it was given').toBe(role.name);
  expect(crew[0].actorName, 'and it is the actor that was put there').toBe(gunner.actorName);
});

test('the same actor can hold two roles at once', async ({ world, page }) => {
  const ship = await world.build({
    actor: 'vehicle',
  });
  const crew = await world.build({
    actor: 'character',
  });
  const [gunner] = await api.readCrewRoles(page);

  await api.setCrewRoles(page, ship.actor, crew.actor, ['Pilot', gunner.name]);

  const aboard = await api.readCrew(page, ship.actor);
  const names = [...new Set(aboard.map((member) => member.actorName))];

  expect(aboard, 'an entry for each role').toHaveLength(2);
  expect(aboard.map((member) => member.role).sort(), 'both roles').toEqual(['Pilot', gunner.name].sort());
  expect(names, 'both of them the same person').toEqual([crew.actorName]);
});

test('deregistering one role leaves the actor in the other', async ({ world, page }) => {
  const ship = await world.build({
    actor: 'vehicle',
  });
  const crew = await world.build({
    actor: 'character',
  });
  const [gunner] = await api.readCrewRoles(page);

  await api.setCrewRoles(page, ship.actor, crew.actor, ['Pilot', gunner.name]);
  await api.removeCrewRole(page, ship.actor, crew.actor, gunner.name);

  const aboard = await api.readCrew(page, ship.actor);

  expect(aboard.map((member) => member.role), 'they are still flying').toEqual(['Pilot']);
  expect(aboard[0].actorName, 'and it is still them').toBe(crew.actorName);
});

test('changing a role does not duplicate the crew member', async ({ world, page }) => {
  const ship = await world.build({
    actor: 'vehicle',
  });
  const crew = await world.build({
    actor: 'character',
  });
  const [gunner] = await api.readCrewRoles(page);

  await api.setCrewRoles(page, ship.actor, crew.actor, [gunner.name]);
  await api.changeCrewRole(page, ship.actor, crew.actor, gunner.name, 'Pilot');

  const aboard = await api.readCrew(page, ship.actor);

  expect(aboard, 'still one person aboard').toHaveLength(1);
  expect(aboard[0].role, 'flying rather than shooting').toBe('Pilot');
});

test('a crew roll uses the crew member’s skill, not the vehicle’s', async ({ world, page, consumers }) => {
  const ship = await world.build({
    actor: 'vehicle',
  });
  const crew = await world.build({
    actor: 'character',
  });
  const [gunner] = await api.readCrewRoles(page);

  await api.setCrewRoles(page, ship.actor, crew.actor, [gunner.name]);

  const pool = await consumers.crewPool(ship.actor, crew.actor, gunner.name);

  expect(gunner.skill, 'the role names a skill').toBe('Gunnery');
  expect([pool.ability, pool.proficiency], 'the dice are the gunner\'s').toEqual([1, 1]);
});

test('a crew roll picks up modifiers from the crew member’s own items', async ({ world, page, consumers }) => {
  const ship = await world.build({
    actor: 'vehicle',
  });
  const crew = await world.build({
    actor: 'character',
    item: 'armour',
    equipped: true,
    attributes: [{
      modtype: 'Skill Boost',
      mod: 'Gunnery',
      value: 1,
    }],
  });
  const [gunner] = await api.readCrewRoles(page);

  await api.setCrewRoles(page, ship.actor, crew.actor, [gunner.name]);

  expect(await consumers.crewPool(ship.actor, crew.actor, gunner.name), 'kit and all').toEqual({
    ability: 1, proficiency: 1, boost: 1,
    setback: 0, remsetback: 0, difficulty: 0, challenge: 0, force: 0,
  });
});

test('a pilot check uses the handling of the vehicle being piloted', async ({ world, consumers }) => {
  const nimble = await world.build({
    actor: 'vehicle',
    actorOverrides: {
      stats: { handling: { value: 2 } },
    },
  });
  const clumsy = await world.build({
    actor: 'vehicle',
    actorOverrides: {
      stats: { handling: { value: -2 } },
    },
  });
  const pilot = await world.build({
    actor: 'character',
  });

  const good = await consumers.pilotPool(nimble.actor, pilot.actor);
  const bad = await consumers.pilotPool(clumsy.actor, pilot.actor);

  expect([good.boost, good.setback], 'a handy ship lends boost dice').toEqual([2, 0]);
  expect([bad.boost, bad.setback], 'and an unwieldy one costs setback').toEqual([0, 2]);
});

test('removing the crew member’s actor leaves the vehicle readable', async ({ world, page }) => {
  const ship = await world.build({
    actor: 'vehicle',
  });
  const crew = await world.build({
    actor: 'character',
  });
  const [gunner] = await api.readCrewRoles(page);

  await api.setCrewRoles(page, ship.actor, crew.actor, [gunner.name]);
  await api.deleteDoc(page, crew.actor);

  const drawn = await api.buildCrewRoll(page, ship.actor, crew.actor, gunner.name);

  expect(drawn, 'no roll can be built for someone who is gone').toBe(false);
  await expect.poll(
    () => api.readCrew(page, ship.actor),
    { message: 'and the vehicle has let them go' }
  ).toEqual([]);
});

test('crew survive a reload', async ({ world, page }) => {
  const ship = await world.build({
    actor: 'vehicle',
  });
  const crew = await world.build({
    actor: 'character',
  });
  const [gunner] = await api.readCrewRoles(page);

  await api.setCrewRoles(page, ship.actor, crew.actor, ['Pilot', gunner.name]);

  const before = await api.readCrew(page, ship.actor);

  await world.reload();

  const after = await api.readCrew(page, ship.actor);
  const drawn = await api.buildCrewRoll(page, ship.actor, crew.actor, gunner.name);

  expect(after, 'the same crew after the world comes back up').toEqual(before);
  expect(drawn, 'and they can still be rolled for').toBe(true);
});
