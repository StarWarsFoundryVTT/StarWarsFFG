import { test, expect } from '../../support/fixtures';
import * as api from '../../support/api';

/**
 * The ffgParent walk itself.
 */

test('a Modification inside an attachment resolves back to the item that owns it', async ({ world, page }) => {
  const ctx = await world.build({
    actor: 'character', item: 'armour', equipped: true,
    attachment: {
      name: 'insert',
      modifications: [{ name: 'qa chain probe', key: 'Soak', value: 1, installed: true }],
    },
  });

  const walked = await api.resolveParentChain(page, {
    actorUuid: ctx.actor,
    itemUuid: ctx.item,
    modifierType: 'itemmodifier',
    modifierIndex: 0,
  });

  expect(walked.uuid, 'the walk ends at the owned armour').toBe(ctx.item);
  expect(walked.name, 'and not at some other document').toBe(ctx.itemName);
});

test('the chain from a Modification is two hops, not one', async ({ world, page }) => {
  const ctx = await world.build({
    actor: 'character', item: 'armour', equipped: true,
    attachment: {
      name: 'insert',
      modifications: [{ name: 'qa chain probe', key: 'Soak', value: 1, installed: true }],
    },
  });

  const walked = await api.resolveParentChain(page, {
    actorUuid: ctx.actor,
    itemUuid: ctx.item,
    modifierType: 'itemmodifier',
    modifierIndex: 0,
  });

  expect(walked.chain.length, `chain was ${walked.chain.join(' -> ')}`).toBeGreaterThan(1);
});

test('a Modification on a world item resolves without an actor', async ({ world, page }) => {
  const item = await world.item({
    item: 'armour',
    attachment: {
      name: 'insert',
      modifications: [{ name: 'qa chain probe', key: 'Soak', value: 1, installed: true }],
    },
  });

  const walked = await api.resolveParentChain(page, {
    itemUuid: item,
    modifierType: 'itemmodifier',
    modifierIndex: 0,
  });

  expect(walked.uuid, 'the world item that owns it').toBe(item);
});

test('a write through the chain reaches the real document', async ({ world, page }) => {
  const ctx = await world.build({
    actor: 'character', item: 'armour', equipped: true,
    attachment: {
      name: 'insert',
      modifications: [{ name: 'qa chain probe', key: 'Soak', value: 1, installed: true }],
    },
  });

  await api.writeThroughParentChain(page, {
    actorUuid: ctx.actor,
    itemUuid: ctx.item,
    modifierType: 'itemmodifier',
    modifierIndex: 0,
    // the shape the one real caller uses (items/item-sheet-ffg.js:1135)
    data: { system: { active: false } },
  });

  const written = await api.read(
    page, ctx.item, 'system.itemattachment.0.system.itemmodifier.0.system.active');
  expect(written, 'the edit landed in the nested array').toBe(false);
});

test('a write does not clobber the sibling beside it', async ({ world, page }) => {
  const ctx = await world.build({
    actor: 'character', item: 'armour', equipped: true,
    attachment: {
      name: 'insert',
      modifications: [
        { name: 'qa first', key: 'Soak', value: 1, installed: true },
        { name: 'qa second', key: 'Defence-Melee', value: 1, installed: true },
      ],
    },
  });

  await api.writeThroughParentChain(page, {
    actorUuid: ctx.actor,
    itemUuid: ctx.item,
    modifierType: 'itemmodifier',
    modifierIndex: 0,
    data: { system: { active: false } },
  });

  const nested = await api.read(page, ctx.item, 'system.itemattachment.0.system.itemmodifier');
  expect(nested[0].system.active, 'the one that was edited').toBe(false);
  expect(nested[1].system.active, 'the one that was not').toBe(true);
});

test.fixme("a write reaches the addressed attachment's Modification, not the last one's", async ({ world, page }) => {
  const ctx = await world.build({
    actor: 'character', item: 'armour', equipped: true,
    attachment: {
      name: 'first',
      modifications: [{ name: 'qa on first', key: 'Soak', value: 1, installed: true }],
    },
  });

  await world.attach(ctx, {
    name: 'second',
    modifications: [{ name: 'qa on second', key: 'Defence-Melee', value: 1, installed: true }],
  });

  await api.writeThroughParentChain(page, {
    actorUuid: ctx.actor,
    itemUuid: ctx.item,
    modifierType: 'itemmodifier',
    modifierIndex: 0,
    data: { system: { active: false } },
  });

  const attachments = await api.read(page, ctx.item, 'system.itemattachment');
  // FIXME: currently fails; the last one gets written
  expect(attachments[0].system.itemmodifier[0].system.active, 'the one that was addressed').toBe(false);
  expect(attachments[1].system.itemmodifier[0].system.active, 'the one that was not').toBe(true);
});
