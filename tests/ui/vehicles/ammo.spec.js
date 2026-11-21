import { test, expect } from '../../support/fixtures';
import * as api from '../../support/api';

/**
 * #2337 vehicle weapons track ammo the same way personal weapons do, once Enable Ammo is on.
 */

async function crewedWeapon(world, page, ammo) {
  const ship = await world.build({
    actor: 'vehicle',
    item: 'shipweapon',
    itemOverrides: {
      ammo: { value: ammo, max: 2 },
    },
  });
  const crew = await world.build({
    actor: 'character',
  });
  const [gunner] = await api.readCrewRoles(page);

  await api.setCrewRoles(page, ship.actor, crew.actor, [gunner.name]);
  // nested, not dotted: ItemBaseFFG.update adds `flags: {}`, which wipes a dotted flags path
  await api.update(page, ship.item, {
    flags: {
      starwarsffg: {
        config: {
          enableAmmo: true,
        },
      },
    },
  });
  return ship;
}

test('#2337 firing a vehicle weapon spends a round', async ({ world, page }) => {
  const ship = await crewedWeapon(world, page, 2);

  await api.rollWeapon(page, ship.actor, ship.item, { from: 'sheet' });

  expect(await api.read(page, ship.item, 'system.ammo.value'), 'one round left').toBe(1);
});

test('#2337 an empty vehicle weapon will not fire', async ({ world, page }) => {
  const ship = await crewedWeapon(world, page, 0);

  await expect(
    api.rollWeapon(page, ship.actor, ship.item, { from: 'sheet' }),
    'no roll dialog for an empty weapon'
  ).rejects.toThrow('never opened');
  expect(await api.read(page, ship.item, 'system.ammo.value'), 'and no rounds go negative').toBe(0);
});
