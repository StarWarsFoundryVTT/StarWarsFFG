import { test, expect } from '../../support/fixtures';
import * as api from '../../support/api';

/**
 * Edit mode suspends every Active Effect on an actor, then puts them back.
 */

test('entering edit mode suspends the effects an item was granting', async ({ world, page, consumers }) => {
  // The armour's own soak is carried by its inherent effect, so it needs no modifier of its own to
  // have something to suspend.
  const ctx = await world.build({
    actor: 'character',
    item: 'armour',
    equipped: true,
  });

  expect(await consumers.stat(ctx, 'Soak'), 'the armour is doing its work').toBe(3 + 2);

  await api.setEditMode(page, ctx.actor, true);

  const effects = await api.readEffects(page, ctx.actor);

  expect(effects.filter((effect) => !effect.disabled), 'nothing is left switched on').toEqual([]);
  expect(await consumers.stat(ctx, 'Soak'), 'and the soak is the character\'s own again').toBe(3);
});

test('leaving edit mode restores them', async ({ world, page, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'armour',
    equipped: true,
  });

  await api.setEditMode(page, ctx.actor, true);
  await expect.poll(
    () => consumers.stat(ctx, 'Soak'),
    { message: 'suspended first' }
  ).toBe(3);

  await api.setEditMode(page, ctx.actor, false);

  const effects = await api.readEffects(page, ctx.actor);

  expect(effects.filter((effect) => effect.disabled), 'nothing is left switched off').toEqual([]);
  expect(await consumers.stat(ctx, 'Soak'), 'and the armour is doing its work again').toBe(3 + 2);
});

test('an effect that was already disabled stays disabled afterwards', async ({ world, page, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'armour',
    equipped: true,
  });

  await world.equip(ctx, false);

  expect(await consumers.stat(ctx, 'Soak'), 'the armour is contributing nothing').toBe(3);

  const before = await api.readEffects(page, ctx.actor);

  await api.setEditMode(page, ctx.actor, true);
  await api.setEditMode(page, ctx.actor, false);

  expect(await api.readEffects(page, ctx.actor), 'every effect is as it was').toEqual(before);
  expect(await consumers.stat(ctx, 'Soak'), 'and it is contributing nothing still').toBe(3);
});

test('an uninstalled Modification is still uninstalled afterwards', async ({ world, page }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'armour',
    equipped: true,
  });

  await world.attach(ctx, {
    modifications: [
      { name: 'qa soak', key: 'Soak', value: 2 },
    ],
  });

  await world.setModificationInstalled(ctx, 0, false);

  const installed = 'system.itemattachment.0.system.itemmodifier.0.system.active';

  expect(await api.read(page, ctx.item, installed), 'uninstalled to begin with').toBe(false);

  const before = await api.readEffects(page, ctx.actor);

  await api.setEditMode(page, ctx.actor, true);
  await api.setEditMode(page, ctx.actor, false);

  expect(await api.read(page, ctx.item, installed), 'and uninstalled still').toBe(false);
  expect(await api.readEffects(page, ctx.actor), 'every effect is as it was').toEqual(before);
});

test('an unlearned talent is still unlearned afterwards', async ({ world, page, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'specialization',
    talents: [
      {
        name: 'qa unlearned talent',
        islearned: false,
        attributes: [{
          modtype: 'Stat',
          mod: 'Soak',
          value: 2,
        }],
      },
    ],
  });

  expect((await consumers.talent(ctx, 0)).islearned, 'unlearned to begin with').toBe(false);
  expect(await consumers.stat(ctx, 'Soak'), 'and contributing nothing').toBe(3);

  const before = await api.readEffects(page, ctx.actor);

  await api.setEditMode(page, ctx.actor, true);
  await api.setEditMode(page, ctx.actor, false);

  expect((await consumers.talent(ctx, 0)).islearned, 'and unlearned still').toBe(false);
  expect(await api.readEffects(page, ctx.actor), 'every effect is as it was').toEqual(before);
});

test('editing a characteristic in edit mode does not double-count its effects', async ({ world, page, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'armour',
    equipped: true,
    attributes: [{
      modtype: 'Stat',
      mod: 'Wounds',
      value: 3,
    }],
  });

  expect(await consumers.stat(ctx, 'Wounds'), 'species base, Brawn and armour').toBe(12 + 3);

  await api.setEditMode(page, ctx.actor, true);
  await api.setCharacteristic(page, ctx.actor, 'Brawn', 4);
  await api.setEditMode(page, ctx.actor, false);

  expect(await consumers.stat(ctx, 'Brawn'), 'the characteristic was raised').toBe(4);
  expect(await consumers.stat(ctx, 'Wounds'), 'one more than before, not four').toBe(13 + 3);
  expect(await consumers.stat(ctx, 'Soak'), 'and soak follows Brawn').toBe(4 + 2);
});

test('buying a talent leaves the character\'s effects enabled', async ({ world, page, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'specialization',
    talents: [
      {
        name: 'qa bought talent',
        islearned: false,
        attributes: [{
          modtype: 'Stat',
          mod: 'Wounds',
          value: 1,
        }],
      },
    ],
  });

  // something with effects of its own, to see whether the purchase leaves them switched off
  const armour = await world.addItem(ctx, { item: 'armour', equipped: true });

  expect(await consumers.stat(ctx, 'Soak'), 'the armour is doing its work').toBe(3 + 2);

  await world.buy(ctx, 0);

  const effects = await api.readEffects(page, ctx.actor);
  const wearing = effects.filter((effect) => effect.on === armour.itemName);

  expect(wearing.filter((effect) => effect.disabled), 'the armour is still switched on').toEqual([]);
  expect(await consumers.stat(ctx, 'Soak'), 'and still doing its work').toBe(3 + 2);
});

test('buying a force power upgrade leaves the character\'s effects enabled', async ({ world, page, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'forcepower',
    talents: [
      {
        name: 'qa upgrade',
        islearned: false,
        cost: 10,
        attributes: [{
          modtype: 'Stat',
          mod: 'Wounds',
          value: 1,
        }],
      },
    ],
  });

  const armour = await world.addItem(ctx, { item: 'armour', equipped: true });

  expect(await consumers.stat(ctx, 'Soak'), 'the armour is doing its work').toBe(3 + 2);

  await world.buy(ctx, 0);

  const effects = await api.readEffects(page, ctx.actor);
  const wearing = effects.filter((effect) => effect.on === armour.itemName);

  expect(wearing.filter((effect) => effect.disabled), 'the armour is still switched on').toEqual([]);
  expect(await consumers.stat(ctx, 'Soak'), 'and still doing its work').toBe(3 + 2);
});

test('granting XP from the group manager leaves effects as they were', async ({ world, page, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'armour',
    equipped: true,
  });

  expect(await consumers.stat(ctx, 'Soak'), 'the armour is doing its work').toBe(3 + 2);

  const before = await api.readEffects(page, ctx.actor);

  await api.grantXp(page, ctx.actor, 10);

  expect((await consumers.xp(ctx)).total, 'the XP arrived').toBe(250 + 10);
  expect(await api.readEffects(page, ctx.actor), 'every effect is as it was').toEqual(before);
  expect(await consumers.stat(ctx, 'Soak'), 'and the armour still is').toBe(3 + 2);
});

test('edit mode from the sheet is not written to storage', async ({ world, page, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'armour',
    equipped: true,
  });

  await api.setEditMode(page, ctx.actor, true);

  expect(await consumers.stat(ctx, 'Soak'), 'suspended while the mode is on').toBe(3);

  await world.reload();

  const effects = await api.readEffects(page, ctx.actor);

  expect(effects.filter((effect) => effect.disabled), 'nothing was written down').toEqual([]);
  expect(await consumers.stat(ctx, 'Soak'), 'and the armour is working again').toBe(3 + 2);
});

// snapshot section

test('reopening the sheet does not leave the actor half in edit mode', async ({ world, page, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'armour',
    equipped: true,
  });

  await api.setEditMode(page, ctx.actor, true);
  await world.reload();

  // the flag is a real write while the suspension is not, so a reload brings back an actor whose
  // effects are live but which still refuses to be edited. Opening the sheet is what settles it
  expect(await api.readEditMode(page, ctx.actor), 'the flag outlived the suspension').toBe(true);

  await api.openSheet(page, ctx.actor);

  await expect.poll(
    () => api.readEditMode(page, ctx.actor),
    { message: 'and a fresh sheet turns it off' }
  ).toBe(false);
  expect(await consumers.stat(ctx, 'Soak'), 'with the armour working throughout').toBe(3 + 2);
});

test.fixme('entering edit mode twice does not lose what was enabled', async ({ world, page, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'armour',
    equipped: true,
  });

  await api.setEditMode(page, ctx.actor, true);

  await api.closeSheet(page, ctx.actor);
  await api.setEditMode(page, ctx.actor, true);
  await api.setEditMode(page, ctx.actor, false);

  const effects = await api.readEffects(page, ctx.actor);

  // FIXME: #2307
  expect(effects.filter((effect) => effect.disabled), 'nothing is left switched off').toEqual([]);
  expect(await consumers.stat(ctx, 'Soak'), 'and the armour is doing its work again').toBe(3 + 2);
});

// what the mode is for: editing figures that effects would otherwise fight over

test('a purchase is refused while edit mode is enabled', async ({ world, page, consumers, consoleGuard }) => {
  const ctx = await world.build({
    actor: 'character',
  });

  await api.setEditMode(page, ctx.actor, true);

  const brawn = await api.read(page, ctx.actor, 'system.characteristics.Brawn.value');

  // `allowEditMode` only turns off the harness's own guard against buying by accident - the sheet
  // is left to refuse on its own terms, which it does before it asks anything
  await api.buyCharacteristicRank(page, ctx.actor, 'Brawn', { allowEditMode: true });

  expect(await consoleGuard.notifications(), 'the sheet says why').toContainEqual(
    expect.stringContaining('EditMode is enabled'),
  );
  expect(await api.openDialogs(page), 'no purchase was ever offered').toEqual([]);
  expect((await consumers.xp(ctx)).available, 'the XP is where it was').toBe(100);
  expect(
    await api.read(page, ctx.actor, 'system.characteristics.Brawn.value'),
    'and so is the characteristic'
  ).toBe(brawn);
});

test('an item added while in edit mode is not left suspended', async ({ world, page, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'armour',
    equipped: true,
  });

  await api.setEditMode(page, ctx.actor, true);

  const gear = await world.addItem(ctx, {
    item: 'gear',
    attributes: [{
      modtype: 'Stat',
      mod: 'Wounds',
      value: 3,
    }],
  });

  await api.setEditMode(page, ctx.actor, false);

  const effects = await api.readEffects(page, ctx.actor);
  const carried = effects.filter((effect) => effect.on === gear.itemName);

  expect(carried.filter((effect) => effect.disabled), 'the new item is switched on').toEqual([]);
  expect(await consumers.stat(ctx, 'Wounds'), 'and counted').toBe(12 + 3);
  expect(await consumers.stat(ctx, 'Soak'), 'with the armour back as well').toBe(3 + 2);
});

test('an item removed while in edit mode does not strand its snapshot', async ({ world, page, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'armour',
    equipped: true,
  });

  const gear = await world.addItem(ctx, {
    item: 'gear',
    attributes: [{
      modtype: 'Stat',
      mod: 'Wounds',
      value: 3,
    }],
  });

  expect(await consumers.stat(ctx, 'Wounds'), 'the gear is counted').toBe(12 + 3);

  await api.setEditMode(page, ctx.actor, true);
  await api.deleteDoc(page, gear.item);
  await api.setEditMode(page, ctx.actor, false);

  const effects = await api.readEffects(page, ctx.actor);

  expect(effects.filter((effect) => effect.disabled), 'nothing is left switched off').toEqual([]);
  expect(await consumers.stat(ctx, 'Wounds'), 'the gear that went is not').toBe(12);
  expect(await consumers.stat(ctx, 'Soak'), 'and the armour that stayed is').toBe(3 + 2);
});

test('editing a characteristic in edit mode moves its thresholds with it', async ({ world, page, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
  });

  await api.setEditMode(page, ctx.actor, true);
  await api.setCharacteristic(page, ctx.actor, 'Willpower', 5);
  await api.setCharacteristic(page, ctx.actor, 'Brawn', 1);
  await api.setEditMode(page, ctx.actor, false);

  expect(await consumers.stat(ctx, 'Strain'), 'the strain threshold follows Willpower').toBe(13 + 2);
  expect(await consumers.stat(ctx, 'Wounds'), 'and the wound threshold Brawn').toBe(12 - 2);
  expect(await consumers.stat(ctx, 'Soak'), 'which soak follows too').toBe(1);
});

test('a reload while in edit mode does not strand the suspended effects', async ({ world, page, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'armour',
    equipped: true,
  });

  await api.setEditMode(page, ctx.actor, true);
  await world.reload();
  
  await api.setEditMode(page, ctx.actor, true);

  expect(await consumers.stat(ctx, 'Soak'), 'suspended again, on purpose this time').toBe(3);

  await api.setEditMode(page, ctx.actor, false);

  const effects = await api.readEffects(page, ctx.actor);

  expect(effects.filter((effect) => effect.disabled), 'nothing is left switched off').toEqual([]);
  expect(await consumers.stat(ctx, 'Soak'), 'and the armour is doing its work again').toBe(3 + 2);
});

test('a drop is refused while edit mode is enabled', async ({ world, page, consoleGuard }) => {
  const ctx = await world.build({
    actor: 'character',
  });

  const armour = await world.item({ item: 'armour' });

  await api.setEditMode(page, ctx.actor, true);

  await expect(
    api.dropOnActorSheet(page, ctx.actor, armour, { allowEditMode: true }),
    'the sheet turns it away'
  ).rejects.toThrow(/refused the drop/);

  expect(await consoleGuard.notifications(), 'and says why').toContainEqual(
    expect.stringContaining('EditMode is enabled'),
  );
  expect(await api.readOwnedItems(page, ctx.actor), 'nothing was carried in').toEqual([]);
});
