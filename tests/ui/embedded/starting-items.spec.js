import { test, expect } from '../../support/fixtures';
import * as api from '../../support/api';
import { ITEMS } from '../../fixtures/documents';

/**
 * #1595 / #1596: weapons, armour and gear dropped on a species or career are linked, and a character
 * gets its own copy of each, as the item stands then, when the species or career is added. Removing
 * the species or career asks before taking them away again
 */

const PARENTS = ['species', 'career'];

/** The tab each sheet takes drops on, and lists its starting gear in. */
const TAB = {
  species: 'talents',
  career: 'career',
};

/** Drop an item on the sheet's tab as a drag would, through the sheet's own DragDrop binding. */
async function dropStartingItem(page, parentUuid, droppedUuid) {
  await api.openSheet(page, parentUuid);
  const problem = await page.evaluate(async ({ parentUuid, droppedUuid, tabs }) => {
    const parent = await fromUuid(parentUuid);
    const root = parent.sheet.element?.[0] ?? parent.sheet.element;
    const target = root.querySelector(`.tab.${tabs[parent.type]}`);
    if (!target) return `the ${parent.type} sheet has no .tab.${tabs[parent.type]}`;
    const before = Object.keys(parent.system.startingItems).length;

    const dataTransfer = new DataTransfer();
    dataTransfer.setData('text/plain', JSON.stringify({ type: 'Item', uuid: droppedUuid }));
    target.dispatchEvent(new DragEvent('drop', { dataTransfer, bubbles: true, cancelable: true }));

    const deadline = Date.now() + 5000;
    while (Object.keys(parent.system.startingItems).length === before) {
      if (Date.now() > deadline) return 'the drop never added a starting item';
      await new Promise((r) => setTimeout(r, 25));
    }
    return null;
  }, { parentUuid, droppedUuid, tabs: TAB });
  await api.closeSheet(page, parentUuid);
  if (problem) throw new Error(problem);
}

/** Names of the items on the actor that the given species or career granted - even once it is gone */
async function grantedNames(page, actorUuid, parentUuid) {
  const parentId = parentUuid.split('.').pop();
  return page.evaluate(async ({ actorUuid, parentId }) => {
    const actor = await fromUuid(actorUuid);
    const granted = actor.items.filter((i) => i.getFlag('starwarsffg', 'grantedBy') === parentId);
    return granted.map((i) => i.name);
  }, { actorUuid, parentId });
}

const deleteDoc = (page, uuid) => page.evaluate((uuid) => fromUuid(uuid).then((d) => d.delete()), uuid);

async function setup(world, page, type) {
  const parent = world.track(await api.createItem(page, {
    type,
    name: `qa-${type}-${Date.now()}`,
    // a blank species can't have its sheet closed - its inherent effect lacks the characteristics
    system: ITEMS[type].system,
  }));
  const weapon = world.track(await api.createItem(page, {
    type: 'weapon',
    name: 'qa-claws',
  }));
  await api.waitForInherentEffect(page, parent);
  await dropStartingItem(page, parent, weapon);
  const actor = await world.actor({
    actor: 'character',
  });
  return { parent, weapon, actor };
}

for (const type of PARENTS) {
  test(`a character gets its own copy of a ${type}'s starting gear`, async ({ world, page }) => {
    const { parent, actor } = await setup(world, page, type);
    const embedded = await api.dropOnActorSheet(page, actor, parent);

    await expect.poll(() => grantedNames(page, actor, embedded)).toEqual(['qa-claws']);
  });

  test(`a weapon dropped on a ${type} is linked, not copied`, async ({ world, page }) => {
    const { parent, weapon, actor } = await setup(world, page, type);
    await api.update(page, weapon, { name: 'qa-claws-renamed' });
    const embedded = await api.dropOnActorSheet(page, actor, parent);

    const granted = () => grantedNames(page, actor, embedded);
    await expect.poll(granted, { message: 'the character gets the renamed original' }).toEqual(['qa-claws-renamed']);
  });

  test(`a ${type} whose linked gear was deleted grants nothing for it`, async ({ world, page }) => {
    const { parent, weapon, actor } = await setup(world, page, type);
    await deleteDoc(page, weapon);
    const embedded = await api.dropOnActorSheet(page, actor, parent);

    const warned = () => page.evaluate(() => window.__qaNotifications.some((n) => n.includes('no longer exists')));
    await expect.poll(warned, { message: 'the missing link is reported' }).toBe(true);
    expect(await grantedNames(page, actor, embedded)).toEqual([]);
  });

  test(`the ${type} sheet lists its starting gear`, async ({ world, page }) => {
    const { parent, weapon } = await setup(world, page, type);
    await api.update(page, weapon, { name: 'qa-claws-renamed' });
    const sheetId = await api.openSheet(page, parent);
    await page.locator(`#${sheetId} .sheet-tabs [data-tab="${TAB[type]}"]`).click();
    const row = page.locator(`#${sheetId} li[data-item-type="startingitem"]`);

    await expect(row, 'the row shows the linked item\'s current name').toContainText('qa-claws-renamed');
    await deleteDoc(page, weapon);
    await api.closeSheet(page, parent);
    await api.openSheet(page, parent);
    await page.locator(`#${sheetId} .sheet-tabs [data-tab="${TAB[type]}"]`).click();
    await expect(row, 'a deleted link is marked broken').toHaveClass(/link-broken/);

    await row.locator('.item-delete').click();
    await expect(row).toHaveCount(0);
    expect(await api.read(page, parent, 'system.startingItems')).toEqual({});
    await api.closeSheet(page, parent);
  });

  test(`removing a ${type} asks before removing its starting gear`, async ({ world, page }) => {
    const { parent, actor } = await setup(world, page, type);

    const kept = await api.dropOnActorSheet(page, actor, parent);
    await expect.poll(() => grantedNames(page, actor, kept)).toEqual(['qa-claws']);
    await deleteDoc(page, kept);
    await page.locator('dialog button[data-action="no"]').click();
    expect(await grantedNames(page, actor, kept), 'answering no keeps the gear').toEqual(['qa-claws']);

    const removed = await api.dropOnActorSheet(page, actor, parent);
    await expect.poll(() => grantedNames(page, actor, removed)).toEqual(['qa-claws']);
    await deleteDoc(page, removed);
    expect(await api.confirmDialog(page), 'a removal prompt appears').toBe(true);
    const remaining = () => grantedNames(page, actor, removed);
    await expect.poll(remaining, { message: 'answering yes removes it' }).toEqual([]);
  });
}
