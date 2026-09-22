import { test, expect } from '../../support/fixtures';
import * as api from '../../support/api';
import * as itemSheet from '../../support/pages/item-sheet';

/**
 * Which document a sheet is bound to, and whether it lets go.
 *
 * Not about layout - about identity. Several open bugs are the same shape: a handler writes to
 * `this.object` while more than one sheet of that type is open, or a sheet keeps hold of a
 * document it no longer owns. #1708 is a talent dropped on the second of two open species sheets
 * landing on the first; #1739 is an item sheet opened from a compendium that will not close.
 *
 * The smoke suite proves each sheet type renders. This is what happens once two of them are open
 * at the same time, or the document underneath changes.
 */

test('#1708 with two species sheets open, a drop lands on the one it was dropped on', async ({ world, page }) => {
  const first = await world.item({ item: 'species', label: 'first' });
  const second = await world.item({ item: 'species', label: 'second' });
  const talent = await world.item({ item: 'talent' });

  await api.openSheet(page, first);
  await api.openSheet(page, second);

  await api.dropOnSheetElement(page, second, talent);

  const onSecond = await api.read(page, second, 'system.talents');
  const onFirst = await api.read(page, first, 'system.talents');

  expect(Object.keys(onSecond ?? {}), 'the talent is on the species it was dropped on').toHaveLength(1);
  expect(Object.keys(onFirst ?? {}), 'and not on the one that was opened first').toHaveLength(0);
});

test('#1739 an item sheet opened from a compendium closes', async ({ world, page }) => {
  const inWorld = await world.item({ item: 'talent', label: 'world' });
  const inPack = await world.item({ item: 'talent', origin: 'compendium', label: 'packed' });

  // Closed by the button rather than by `close()`, because the report is that the window stays on
  // screen until a refresh - and `close()` is not what a player reaches for.
  const fromSidebar = await api.openSheet(page, inWorld);
  await api.closeWindow(page, fromSidebar);

  expect(await api.isWindowOpen(page, fromSidebar), 'a sheet from the sidebar closes').toBe(false);

  const fromPack = await api.openSheet(page, inPack);
  await api.closeWindow(page, fromPack);

  expect(await api.isWindowOpen(page, fromPack), 'and so does one from a compendium').toBe(false);
});

test('two sheets for the same document show the same values after an edit', async ({ world, page }) => {
  const weapon = await world.item({ item: 'weapon' });

  const second = await api.openSheet(page, weapon);
  const first = await api.openSheetAs(page, weapon, 'ffg.ItemSheetFFG');

  await api.update(page, weapon, { 'system.damage.value': 9 });

  const damage = 'data.damage.value';

  await expect.poll(
    () => itemSheet.fieldValue(page, first, damage),
    { message: 'the older sheet caught the change' }
  ).toBe('9');
  await expect.poll(
    () => itemSheet.fieldValue(page, second, damage),
    { message: 'and so did the newer one' }
  ).toBe('9');
});

test('editing through one sheet updates the other', async ({ world, page }) => {
  const weapon = await world.item({ item: 'weapon' });

  const second = await api.openSheet(page, weapon);
  const first = await api.openSheetAs(page, weapon, 'ffg.ItemSheetFFG');
  const damage = 'data.damage.value';

  await itemSheet.setFieldValue(page, first, damage, '11');

  await expect.poll(
    () => api.read(page, weapon, 'system.damage.value'),
    { message: 'the edit reached the weapon' }
  ).toBe(11);
  await expect.poll(
    () => itemSheet.fieldValue(page, second, damage),
    { message: 'and the window that was not edited shows it' }
  ).toBe('11');
});

test('deleting a document closes the sheet that was showing it', async ({ world, page }) => {
  const weapon = await world.item({ item: 'weapon' });

  const second = await api.openSheet(page, weapon);
  const first = await api.openSheetAs(page, weapon, 'ffg.ItemSheetFFG');

  await api.deleteDoc(page, weapon);

  await expect.poll(
    () => api.isWindowOpen(page, first),
    { message: 'the window went with the weapon' }
  ).toBe(false);
  await expect.poll(
    () => api.isWindowOpen(page, second),
    { message: 'and so did the other one' }
  ).toBe(false);
});

test('an owned item’s sheet writes to the owned copy, not the world item', async ({ world, page }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'weapon',
    equipped: true,
  });

  const owned = await api.openSheet(page, ctx.item);

  await itemSheet.setFieldValue(page, owned, 'data.damage.value', '12');

  await expect.poll(
    () => api.read(page, ctx.item, 'system.damage.value'),
    { message: 'the copy the character carries took the edit' }
  ).toBe(12);
  expect(
    await api.read(page, ctx.source, 'system.damage.value'),
    'and the one it was made from is as it was'
  ).toBe(6);
});

test('a nested modifier’s editor closes without writing to the temporary item', async ({ world, page }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'armour',
    equipped: true,
    attachment: {
      name: 'insert',
      modifications: [{ name: 'qa soak', key: 'Soak', value: 1, installed: true }],
    },
  });

  const editor = await api.openModifierEditor(page, {
    actorUuid: ctx.actor,
    itemUuid: ctx.item,
    modifierType: 'itemmodifier',
    modifierIndex: 0,
  });

  const before = await api.read(page, ctx.item, 'system.itemattachment');

  await api.closeWindow(page, editor);

  expect(await api.isWindowOpen(page, editor), 'the editor closed').toBe(false);
  expect(
    await api.read(page, ctx.item, 'system.itemattachment'),
    'and wrote nothing on its way out'
  ).toEqual(before);
});

test('reopening a sheet after a reload shows the stored values', async ({ world, page }) => {
  const weapon = await world.item({ item: 'weapon' });
  const damage = 'data.damage.value';

  const before = await api.openSheet(page, weapon);

  await itemSheet.setFieldValue(page, before, damage, '13');
  await expect.poll(
    () => api.read(page, weapon, 'system.damage.value'),
    { message: 'the edit reached the weapon' }
  ).toBe(13);

  await world.reload();

  const after = await api.openSheet(page, weapon);
  const shown = await itemSheet.fieldValue(page, after, damage);

  expect(shown, 'and the sheet built from scratch shows it').toBe('13');
});
