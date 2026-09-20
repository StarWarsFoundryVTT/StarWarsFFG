import { test, expect } from '../../support/fixtures';
import * as api from '../../support/api';

/**
 * The card an item makes when it is sent to chat.
 */

test('a weapon card names its damage and critical rating', async ({ world, page }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'weapon',
    equipped: true,
  });

  await api.sendItemToChat(page, ctx.actor, ctx.item);

  const stats = await api.readCardStats(page);

  expect(stats.map((stat) => stat.value), 'damage, crit and range').toEqual(['6', '3', 'Medium']);
});

test('an armor card names its soak and defence', async ({ world, page }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'armour',
    equipped: true,
  });

  await api.sendItemToChat(page, ctx.actor, ctx.item);

  const stats = await api.readCardStats(page);

  expect(stats.map((stat) => stat.value), 'defence first, then soak').toEqual(['1', '2']);
});

test('an item card carries the description as it is written on the sheet', async ({ world, page }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'gear',
    itemOverrides: {
      description: 'a crate of qa ration packs',
    },
  });

  await api.sendItemToChat(page, ctx.actor, ctx.item);

  const card = await api.readLastChatCard(page);

  expect(card, 'the description as written').toContain('a crate of qa ration packs');
});

test('an item with no qualities gets a card with no descriptors block', async ({ world, page }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'weapon',
    equipped: true,
  });

  await api.sendItemToChat(page, ctx.actor, ctx.item);

  expect(await api.readCardQualities(page), 'no qualities').toEqual([]);
  expect(await api.readCardSections(page), 'and no heading offering').toEqual([]);
});

test('a card lists the attachments on the item that made it', async ({ world, page }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'armour',
    equipped: true,
    attachment: {
      name: 'qa plating',
    },
  });

  await api.sendItemToChat(page, ctx.actor, ctx.item);

  const fitted = await api.read(page, ctx.item, `system.itemattachment.${ctx.attachmentIndex}.name`);

  expect(await api.readCardAttachments(page), 'the attachment is named').toEqual([fitted]);
  expect(await api.readCardQualities(page), 'and not mistaken for a quality').toEqual([]);
});

test('a quality pill carries the rank the item has of it', async ({ world, page }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'weapon',
    equipped: true,
    modifier: {
      name: 'qa pierce',
      key: 'damage',
      modtype: 'Weapon Stat',
      value: 1,
      active: true,
      rank: 2,
    },
  });

  await api.sendItemToChat(page, ctx.actor, ctx.item);

  expect(await api.readCardQualityRanks(page), 'two ranks of it').toEqual({ 'qa pierce': '2' });
});

test('an unequipped item can still be sent to chat', async ({ world, page }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'armour',
    equipped: true,
  });

  await world.equip(ctx, false);
  await api.sendItemToChat(page, ctx.actor, ctx.item);

  const stats = (await api.readCardStats(page)).map((stat) => stat.value);

  expect(await api.readLastChatCard(page), 'the card names the armour').toContain(ctx.itemName);
  expect(stats, 'and prints what it is worth, worn or not').toEqual(['1', '2']);
});

test('a card sent from an owned item speaks as its owner', async ({ world, page }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'weapon',
    equipped: true,
  });

  await api.sendItemToChat(page, ctx.actor, ctx.item);

  const speaker = await api.readLastChatSpeaker(page);

  expect(speaker.alias, 'the character is named as the speaker').toBe(ctx.actorName);
  expect(speaker.actor, 'and the message knows which one').toBe(ctx.actor);
});

test('#2231 a talent sent to chat includes its description', async ({ world, page }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'talent',
    itemOverrides: {
      description: 'qa talent description',
    },
  });

  await api.sendItemToChat(page, ctx.actor, ctx.item);

  const card = await api.readLastChatCard(page);

  expect(card, 'the talent is named on the card').toContain(ctx.itemName);
  expect(card, 'and its description came with it').toContain('qa talent description');
});
