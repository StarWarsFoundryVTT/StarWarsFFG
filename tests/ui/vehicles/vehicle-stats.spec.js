import { test, expect } from '../../support/fixtures';
import * as api from '../../support/api';

/**
 * A vehicle's own numbers, as distinct from modifiers applied to them.
 */

test('hull trauma and system strain thresholds come from the vehicle’s stats', async ({ world, page, consumers }) => {
  const ship = await world.build({
    actor: 'vehicle',
    actorOverrides: {
      stats: {
        hullTrauma: { max: 20 },
        systemStrain: { max: 8 },
      },
    },
  });

  expect(await consumers.stat(ship, 'Hulltrauma'), 'the hull it was built with').toBe(20);
  expect(await consumers.stat(ship, 'Systemstrain'), 'and the strain it can take').toBe(8);

  expect(await api.read(page, ship.actor, 'system.stats.hullTrauma.value'), 'undamaged').toBe(0);
  expect(await api.read(page, ship.actor, 'system.stats.systemStrain.value'), 'and unstrained').toBe(0);
});

test('a ship weapon’s damage is readable from the vehicle', async ({ world, page, consumers }) => {
  const ship = await world.build({
    actor: 'vehicle',
    item: 'shipweapon',
    equipped: true,
  });

  const mounted = (await api.readOwnedItems(page, ship.actor)).filter(
    (item) => item.type === 'shipweapon'
  );

  expect(mounted.map((item) => item.name), 'the weapon is mounted').toEqual([ship.itemName]);
  expect(await consumers.itemAdjusted(ship, 'Damage'), 'and hits for what it says').toBe(6);
  expect(await consumers.itemAdjusted(ship, 'Crit'), 'with the critical rating it came with').toBe(4);
});

test('vehicle encumbrance counts its cargo', async ({ world, consumers }) => {
  const ship = await world.build({
    actor: 'vehicle',
  });

  expect(await consumers.stat(ship, 'VehicleEncumbrance'), 'an empty hold').toBe(0);

  await world.addItem(ship, { item: 'gear' });

  expect(await consumers.stat(ship, 'VehicleEncumbrance'), 'one crate aboard').toBe(2);

  await world.addItem(ship, { item: 'gear' });

  expect(await consumers.stat(ship, 'VehicleEncumbrance'), 'and a second one adds to it').toBe(4);
});
