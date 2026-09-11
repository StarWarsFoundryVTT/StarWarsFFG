import { test, expect } from '../../../support/fixtures';

/**
 * An attachment's Modifications reaching the actor - one carrier per test.
 */

test('a Modification on an attachment on armor reaches the actor', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'armour',
    equipped: true,
    attachment: {
      name: 'insert',
      modifications: [{ name: 'qa melee defence', key: 'Defence-Melee', value: 1, installed: true }],
    },
    itemOverrides: { soak: { value: 0, adjusted: 0 }, defence: { value: 0, adjusted: 0 } },
  });

  expect(await consumers.stat(ctx, 'Defence-Melee'), 'melee adjusted by armor').toBe(1);
});

test('a Modification on an attachment on a weapon reaches the actor', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'weapon',
    equipped: true,
    attachment: {
      name: 'insert',
      modifications: [{ name: 'qa melee defence', key: 'Defence-Melee', value: 1, installed: true }],
    },
    itemOverrides: { soak: { value: 0, adjusted: 0 }, defence: { value: 0, adjusted: 0 } },
  });

  expect(await consumers.stat(ctx, 'Defence-Melee'), 'melee adjusted by weapon').toBe(1);
});

test('a Modification on an attachment on gear reaches the actor', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'armour',
    equipped: true,
    attachment: {
      name: 'gear',
      modifications: [{ name: 'qa melee defence', key: 'Defence-Melee', value: 1, installed: true }],
    },
    itemOverrides: { soak: { value: 0, adjusted: 0 }, defence: { value: 0, adjusted: 0 } },
  });

  expect(await consumers.stat(ctx, 'Defence-Melee'), 'melee adjusted by gear').toBe(1);
});

test('a Modification on an attachment on a ship weapon reaches the vehicle', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'vehicle',
    item: 'shipweapon',
    equipped: true,
    attachment: {
      name: 'mount',
      modifications: [{ name: 'qa handling', key: 'Handling', modtype: 'Vehicle Stat', value: 1, installed: true }],
    },
  });

  expect(await consumers.stat(ctx, 'Handling'), 'handling from inside the attachment').toBe(1 + 1);
});

test.fixme('a Modification shows in the item display', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'armour',
    equipped: true,
    attachment: {
      name: 'insert',
      modifications: [{ name: 'qa soak', key: 'Soak', value: 1, installed: true }],
    },
    itemOverrides: { soak: { value: 0, adjusted: 0 } },
  });

  // FIXME: this sets the correct total soak but does not show it in the gear portion!
  expect(await consumers.itemAdjusted(ctx, 'Soak'), 'the item totals the Modification').toBe(1);
});

test('a Modification shows in the roll pool', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'weapon',
    equipped: true,
    attachment: {
      name: 'mount',
      modifications: [{ name: 'qa boosted', key: 'Add Boost', modtype: 'Roll Modifiers', value: 1, installed: true }],
    },
  });

  const pool = await consumers.poolDice(ctx);
  expect(pool.boost, 'a boost die from inside the attachment').toBe(1);
});

test('a Modification shows on the send-to-chat card', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'armour',
    equipped: true,
    attachment: {
      name: 'insert',
      modifications: [{ name: 'qa soak', key: 'Soak', value: 1, installed: true }],
    },
    itemOverrides: { soak: { value: 0, adjusted: 0 } },
  });

  expect(await consumers.chatCard(ctx, 'qa soak'), 'the nested quality is named on the card').toBe(true);
});

// More than one modifier under the same attachment, and mixing depths on one item.
test('two Modifications on one attachment both apply', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'armour',
    equipped: true,
    itemOverrides: { soak: { value: 0, adjusted: 0 }, defence: { value: 0, adjusted: 0 } },
  });

  await world.attach(ctx, {
    modifications: [
      { name: 'qa soak', key: 'Soak', value: 1, installed: true },
      { name: 'qa melee defence', key: 'Defence-Melee', value: 1, installed: true },
    ],
  });

  expect(await consumers.stat(ctx, 'Soak'), 'the first modifier').toBe(3 + 1);
  expect(await consumers.stat(ctx, 'Defence-Melee'), 'the second modifier').toBe(1);
});

test('Modifications on two attachments both apply', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'armour',
    equipped: true,
    attachment: {
      name: 'insert',
      modifications: [{ name: 'qa soak', key: 'Soak', value: 1, installed: true }],
    },
    itemOverrides: { soak: { value: 0, adjusted: 0 }, defence: { value: 0, adjusted: 0 } },
  });

  await world.attach(ctx, {
    name: 'second',
    modifications: [{ name: 'qa melee defence', key: 'Defence-Melee', value: 1, installed: true }],
  });

  expect(await consumers.stat(ctx, 'Soak'), 'from the first attachment').toBe(3 + 1);
  expect(await consumers.stat(ctx, 'Defence-Melee'), 'from the second attachment').toBe(1);
});

test('an item quality and a Modification on its attachment both apply', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'armour',
    equipped: true,
    attachment: {
      name: 'insert',
      modifications: [{ name: 'qa soak', key: 'Soak', value: 1, installed: true }],
    },
    itemOverrides: { soak: { value: 0, adjusted: 0 }, defence: { value: 0, adjusted: 0 } },
  });

  // alongside the attachment rather than inside it, so the item holds one at each depth
  await world.addModifier(ctx, { name: 'qa melee defence', key: 'Defence-Melee', value: 1, active: true });

  expect(await consumers.stat(ctx, 'Soak'), 'nested in the attachment').toBe(3 + 1);
  expect(await consumers.stat(ctx, 'Defence-Melee'), 'on the item itself').toBe(1);
});

test('a Base Mod and a Modification on the same attachment both apply', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'armour',
    equipped: true,
    attachment: {
      name: 'insert',
      baseMods: [{ modtype: 'Stat', mod: 'Soak', value: 1 }],
      modifications: [{ name: 'qa melee defence', key: 'Defence-Melee', value: 1, installed: true }],
    },
    itemOverrides: { soak: { value: 0, adjusted: 0 }, defence: { value: 0, adjusted: 0 } },
  });

  expect(await consumers.stat(ctx, 'Soak'), "the attachment's Base Mod").toBe(3 + 1);
  expect(await consumers.stat(ctx, 'Defence-Melee'), 'the Modification inside it').toBe(1);
});

test('a Modification of a type the carrier ignores contributes nothing', async ({ world, consumers }) => {
  // Damage is a weapon stat; armour has no damage to adjust and the actor has no such field
  const ctx = await world.build({
    actor: 'character',
    item: 'armour',
    equipped: true,
    attachment: {
      name: 'insert',
      modifications: [{ name: 'qa damage', key: 'Damage', modtype: 'Weapon Stat', value: 2, installed: true }],
    },
    itemOverrides: { soak: { value: 0, adjusted: 0 } },
  });

  expect(await consumers.itemAdjusted(ctx, 'Damage'), 'armour has no damage').toBeNull();
  expect(await consumers.stat(ctx, 'Soak'), 'and nothing leaked into soak').toBe(3);
});

// Base Mods and Modifications side by side, where the interesting part is that they are stored
// differently and merged by different code.
test.fixme('a Base Mod and a Modification granting the same key both apply', async ({ world, consumers }) => {

});

test.fixme("one attachment's Base Mods and another's Modifications both apply", async ({ world, consumers }) => {

});
