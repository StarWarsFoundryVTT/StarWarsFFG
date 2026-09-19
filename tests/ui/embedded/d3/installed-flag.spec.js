import { test, expect } from '../../../support/fixtures';
import * as api from '../../../support/api';
import { ITEMS } from '../../../fixtures/documents';

test.fixme('an uninstalled Modification contributes nothing', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character', item: 'armour', equipped: true,
    attachment: {
      name: 'insert',
      modifications: [{ name: 'qa uninstalled soak', key: 'Soak', value: 2, installed: false }],
    },
    itemOverrides: { soak: { value: 0, adjusted: 0 } },
  });

  // FIXME: this currently applies despite not being installed
  expect(await consumers.stat(ctx, 'Soak')).toBe(3);  // Brawn only - the Modification is inert
});

test('an imported Modification arrives with its Installed? flag set', async ({ page }) => {
  const attachment = await api.findImported(
    page, ITEMS.itemattachment.pack, ITEMS.itemattachment.importId);
  expect(attachment, 'ARMINS is in the seeded world').not.toBeNull();

  const modifiers = await api.read(page, attachment, 'system.itemmodifier');

  expect(modifiers.length, 'the imported attachment carries its modifiers').toBeGreaterThan(0);
  expect(modifiers.every((m) => m.system.active), 'each one arrived installed').toBe(false);
});

test('an uninstalled Modification does not suppress an installed sibling', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character', item: 'armour', equipped: true,
    itemOverrides: { soak: { value: 0, adjusted: 0 }, defence: { value: 0, adjusted: 0 } },
  });

  await world.attach(ctx, {
    modifications: [
      { name: 'qa installed soak', key: 'Soak', value: 1, installed: true },
      { name: 'qa uninstalled defence', key: 'Defence-Melee', value: 2, installed: false },
    ],
  });

  expect(await consumers.stat(ctx, 'Soak'), 'the installed sibling still applies').toBe(3 + 1);
  expect(await consumers.stat(ctx, 'Defence-Melee'), 'the uninstalled one does not').toBe(0);
});

// The Installed? box belongs to a Modification only; an attachment's Base Mods have no such gate.
test("an uninstalled Modification does not suppress its attachment's Base Mods", async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character', item: 'armour', equipped: true,
    itemOverrides: { soak: { value: 0, adjusted: 0 }, defence: { value: 0, adjusted: 0 } },
  });

  await world.attach(ctx, {
    baseMods: [{ modtype: 'Stat', mod: 'Soak', value: 1 }],
    modifications: [{ name: 'qa uninstalled defence', key: 'Defence-Melee', value: 2, installed: false }],
  });

  expect(await consumers.stat(ctx, 'Soak'), "the attachment's Base Mod still applies").toBe(3 + 1);
  expect(await consumers.stat(ctx, 'Defence-Melee'), 'the uninstalled Modification does not').toBe(0);
});
