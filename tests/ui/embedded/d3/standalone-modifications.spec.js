import { test, expect } from '../../../support/fixtures';
import * as api from '../../../support/api';

/**
 * An attachment that is its own item edits its Modifications from its sheet, before it is put on anything,
 * and what is installed there is what arrives on the item it is dropped onto
 */

test('#2235 a Modification can be installed on an attachment that is on nothing', async ({ world, page }) => {
  const attachment = await world.attachment({
    name: 'insert',
    modifications: [{ name: 'qa soak', key: 'Soak', value: 1 }],
  });

  await api.openModificationsEditor(page, attachment);
  await api.setStandaloneModificationSlots(page, attachment, 0, ['modified', 'unmodified']);
  await api.closeModificationsEditor(page, attachment);

  const modification = await api.read(page, attachment, 'system.itemmodifier.0.system');
  expect(modification.slots, 'both attempts are kept').toEqual(['modified', 'unmodified']);
  expect(modification.active, 'and one went in').toBe(true);
  const effects = await api.readItemEffects(page, attachment);
  const soak = effects.find((e) => e.changes.some((c) => c.key.includes('soak')));
  expect(soak?.disabled, 'so its effect is live').toBe(false);
});

test('#2235 a Modification installed beforehand applies on worn armour', async ({ world, page, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'armour',
    equipped: true,
    itemOverrides: { soak: { value: 0, adjusted: 0 } },
  });
  const attachment = await world.attachment({
    name: 'insert',
    modifications: [{ name: 'qa soak', key: 'Soak', value: 1 }],
  });

  await api.openModificationsEditor(page, attachment);
  await api.setStandaloneModificationSlots(page, attachment, 0, ['modified']);
  await api.closeModificationsEditor(page, attachment);
  await api.dropOntoItem(page, ctx.item, attachment);

  expect(await consumers.stat(ctx, 'Soak'), 'brawn 3 and the installed +1').toBe(3 + 1);
});

test('#2235 a Modification left uninstalled does nothing on worn armour', async ({ world, page, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'armour',
    equipped: true,
    itemOverrides: { soak: { value: 0, adjusted: 0 } },
  });
  const attachment = await world.attachment({
    name: 'insert',
    modifications: [{ name: 'qa soak', key: 'Soak', value: 1 }],
  });

  await api.openModificationsEditor(page, attachment);
  await api.setStandaloneModificationSlots(page, attachment, 0, ['failed', 'unmodified']);
  await api.closeModificationsEditor(page, attachment);
  const effects = await api.readItemEffects(page, attachment);
  const soak = effects.find((e) => e.changes.some((c) => c.key.includes('soak')));
  expect(soak?.disabled, 'its effect is off before the drop').toBe(true);
  await api.dropOntoItem(page, ctx.item, attachment);

  expect(await consumers.stat(ctx, 'Soak'), 'brawn only').toBe(3);
});

test('#2235 a mod dropped onto the sheet while the editor is open survives its next save', async ({ world, page }) => {
  const attachment = await world.attachment({
    name: 'insert',
    modifications: [{ name: 'qa first', key: 'Soak', value: 1 }],
  });
  const second = await world.modifier({ name: 'qa second', key: 'Soak', value: 1 });

  await api.openModificationsEditor(page, attachment);
  await api.dropOntoItem(page, attachment, second);
  await api.setStandaloneModificationSlots(page, attachment, 0, ['modified']);
  await api.closeModificationsEditor(page, attachment);

  const modifications = await api.read(page, attachment, 'system.itemmodifier');
  const names = modifications.map((m) => m.name);
  expect(names, 'the dropped mod is still there').toEqual(['qa first', 'qa second']);
});

test('#2235 editing one of two same-named Modifications leaves the other alone', async ({ world, page }) => {
  const attachment = await world.attachment({
    name: 'insert',
    modifications: [
      { name: 'qa twin', key: 'Soak', value: 1 },
      { name: 'qa twin', key: 'Soak', value: 1 },
    ],
  });

  await api.openModificationsEditor(page, attachment);
  await api.setStandaloneModificationSlots(page, attachment, 1, ['modified', 'modified']);
  await api.closeModificationsEditor(page, attachment);

  const modifications = await api.read(page, attachment, 'system.itemmodifier');
  expect(modifications[0].system.active, 'the first is untouched').toBe(false);
  expect(modifications[1].system.slots, 'the second took the edit').toEqual(['modified', 'modified']);
});
