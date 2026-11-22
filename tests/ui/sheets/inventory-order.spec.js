import { test, expect } from '../../support/fixtures';
import * as api from '../../support/api';

/**
 * #1764 - inventory lists can be put in order by dragging, within their own list only.
 * A new item dropped onto a row of its own kind takes its place; unsorted lists keep the order added.
 */

async function buildInventory(world, page) {
  const actor = world.track(await api.createActor(page, { type: 'character', name: 'qa-inventory-order' }));
  const ids = {};
  for (const [name, type] of [['Alpha', 'gear'], ['Bravo', 'gear'], ['Charlie', 'gear'], ['Blaster', 'weapon']]) {
    ids[name] = (await api.createItemOnActor(page, actor, { name, type })).split('.').pop();
  }
  const windowId = await api.openSheet(page, actor);
  const sheet = page.locator(`#${windowId}`);
  await sheet.locator('.sheet-tabs [data-tab="items"]').first().click();
  return { actor, ids, sheet };
}

function row(sheet, id) {
  return sheet.locator(`.items-list > li.item[data-item-id="${id}"]`);
}

// the names in the list holding the given row, top to bottom
async function listOrder(sheet, id) {
  return row(sheet, id).evaluate((li) => Array.from(li.parentElement.children).map(
    (el) => el.querySelector('.hover').firstChild.textContent.trim()));
}

test('#1764 gear can be dragged into a new order', async ({ world, page }) => {
  const { ids, sheet } = await buildInventory(world, page);
  const unsorted = await listOrder(sheet, ids.Alpha);
  expect(unsorted, 'unsorted gear is in the order added').toEqual(['Alpha', 'Bravo', 'Charlie']);

  await row(sheet, ids.Charlie).dragTo(row(sheet, ids.Alpha), { targetPosition: { x: 20, y: 2 } });
  await expect.poll(() => listOrder(sheet, ids.Alpha)).toEqual(['Charlie', 'Alpha', 'Bravo']);
});

test('#1764 gear can be moved down a single spot', async ({ world, page }) => {
  const { ids, sheet } = await buildInventory(world, page);

  await row(sheet, ids.Alpha).dragTo(row(sheet, ids.Bravo), { targetPosition: { x: 20, y: 2 } });
  await expect.poll(() => listOrder(sheet, ids.Alpha)).toEqual(['Bravo', 'Alpha', 'Charlie']);
});

test('#1764 gear cannot be dragged into the weapons list', async ({ world, page }) => {
  const { actor, ids, sheet } = await buildInventory(world, page);

  await row(sheet, ids.Charlie).dragTo(row(sheet, ids.Blaster), { targetPosition: { x: 20, y: 2 } });
  // let a refused drop have its chance to write
  await page.waitForTimeout(500);
  const sorted = await api.read(page, `${actor}.Item.${ids.Charlie}`, 'sort');
  expect(sorted, 'the gear keeps its sort').toBe(0);
  expect(await listOrder(sheet, ids.Alpha), 'nor is the gear list').toEqual(['Alpha', 'Bravo', 'Charlie']);
});

test('#1764 a new item lands where it is dropped', async ({ world, page }) => {
  const { ids, sheet } = await buildInventory(world, page);
  const dropped = world.track(await api.createItem(page, { name: 'Zulu', type: 'gear' }));

  await row(sheet, ids.Bravo).evaluate((li, uuid) => {
    const dataTransfer = new DataTransfer();
    dataTransfer.setData('text/plain', JSON.stringify({ type: 'Item', uuid }));
    li.dispatchEvent(new DragEvent('drop', { dataTransfer, bubbles: true, cancelable: true }));
  }, dropped);

  // it takes the place of the row it was dropped on
  await expect.poll(() => listOrder(sheet, ids.Alpha)).toEqual(['Alpha', 'Zulu', 'Bravo', 'Charlie']);
});
