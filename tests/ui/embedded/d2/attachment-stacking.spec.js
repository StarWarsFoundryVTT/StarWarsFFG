import { test, expect } from '../../../support/fixtures';

/**
 * More than one attachment, or more than one attribute, on the same item.
 */

test('two attachments on one item both apply', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'armour',
    equipped: true,
    attachment: { name: 'plates', baseMods: [{ modtype: 'Stat', mod: 'Soak', value: 1 }] },
    itemOverrides: { soak: { value: 0, adjusted: 0 }, defence: { value: 0, adjusted: 0 } },
  });

  await world.attach(ctx, {
    name: 'weave', baseMods: [{ modtype: 'Stat', mod: 'Defence-Melee', value: 1 }],
  });

  expect(await consumers.stat(ctx, 'Soak'), 'from the attachment built with the item').toBe(3 + 1);
  expect(await consumers.stat(ctx, 'Defence-Melee'), 'from the attachment added afterwards').toBe(1);
});

test('two attachments granting the same attribute key do not collide', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'armour',
    equipped: true,
    attachment: { name: 'plates', baseMods: [{ modtype: 'Stat', mod: 'Soak', value: 1 }] },
    itemOverrides: { soak: { value: 0, adjusted: 0 }, defence: { value: 0, adjusted: 0 } },
  });

  await world.attach(ctx, {
    name: 'more-plates', baseMods: [{ modtype: 'Stat', mod: 'Soak', value: 1 }],
  });

  expect(await consumers.stat(ctx, 'Soak'), 'one from each attachment').toBe(3 + 1 + 1);
});

test('an attachment carrying several attributes applies all of them', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'armour',
    equipped: true,
    attachment: {
      name: 'harness',
      baseMods: [
        { modtype: 'Stat', mod: 'Soak', value: 1 },
        { modtype: 'Stat', mod: 'Defence-Melee', value: 1 },
        { modtype: 'Stat', mod: 'Wounds', value: 2 },
      ],
    },
    itemOverrides: { soak: { value: 0, adjusted: 0 }, defence: { value: 0, adjusted: 0 } },
  });

  expect(await consumers.stat(ctx, 'Soak'), 'first attribute').toBe(3 + 1);
  expect(await consumers.stat(ctx, 'Defence-Melee'), 'second attribute').toBe(1);
  expect(await consumers.stat(ctx, 'Wounds'), 'third attribute').toBe(12 + 2);
});

test('an attachment and a modifier on the same item both apply', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'armour',
    equipped: true,
    attachment: { name: 'plates', baseMods: [{ modtype: 'Stat', mod: 'Soak', value: 1 }] },
    itemOverrides: { soak: { value: 0, adjusted: 0 }, defence: { value: 0, adjusted: 0 } },
  });

  // alongside the attachment rather than nested inside it, which would be D3
  await world.addModifier(ctx, { name: 'qa melee defence', key: 'Defence-Melee', value: 1, active: true });

  expect(await consumers.stat(ctx, 'Soak'), 'from the attachment').toBe(3 + 1);
  expect(await consumers.stat(ctx, 'Defence-Melee'), 'from the modifier on the item').toBe(1);
});

test('removing one of two attachments leaves the other applying', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'armour',
    equipped: true,
    attachment: { name: 'plates', baseMods: [{ modtype: 'Stat', mod: 'Soak', value: 1 }] },
    itemOverrides: { soak: { value: 0, adjusted: 0 }, defence: { value: 0, adjusted: 0 } },
  });

  const weave = await world.attach(ctx, {
    name: 'weave', baseMods: [{ modtype: 'Stat', mod: 'Defence-Melee', value: 1 }],
  });

  expect(await consumers.stat(ctx, 'Defence-Melee'), 'both fitted').toBe(1);

  await world.removeAttachment(ctx, weave);

  expect(await consumers.stat(ctx, 'Defence-Melee'), 'the removed one is gone').toBe(0);
  expect(await consumers.stat(ctx, 'Soak'), 'the one left behind still applies').toBe(3 + 1);
});
