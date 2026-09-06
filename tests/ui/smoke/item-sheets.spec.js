import { test, expect } from '../../support/fixtures';
import * as api from '../../support/api';
import { ITEM_CASES, ITEM_TYPES } from './sheet-matrix';

/** Every registered item sheet opens for every item type. See actor-sheets.spec.js. */

test('the matrix covers every item type', () => {
  expect(ITEM_TYPES).toHaveLength(20);
  expect(ITEM_CASES).toHaveLength(40);
});

test('the matrix matches what the system actually registers', async ({ page, world }) => {
  // A hardcoded count only catches new *types*. This catches a new *sheet* - register one in
  // swffg-main.js without adding it here and the matrix silently stops being complete.
  const missing = [];
  for (const type of ITEM_TYPES) {
    const uuid = world.track(await api.createItem(page, { type, name: `smoke-registry-${type}` }));
    const registered = (await api.registeredSheets(page, 'Item', type)).filter((id) => id.startsWith('ffg.'));
    const covered = ITEM_CASES.filter((c) => c.type === type).map((c) => c.sheet.id);
    for (const id of registered) {
      if (!covered.includes(id)) missing.push(`${type}: ${id} is registered but not in the matrix`);
    }
  }
  expect(missing).toEqual([]);
});

for (const { type, sheet } of ITEM_CASES) {
  test(`${sheet.label} opens for ${type}`, async ({ page, world }) => {
    // Created the way the sidebar dialog does: sheet pinned up front, renderSheet: true.
    const uuid = world.track(
      await api.createItem(page, {
        type,
        name: `smoke-${type}-${sheet.id}`,
        sheetClass: sheet.id,
        renderSheet: true,
      }),
    );
    await api.waitForInherentEffect(page, uuid);

    const windowId = await api.openSheet(page, uuid);
    const sheetEl = page.locator(`#${windowId}`);

    await expect(sheetEl).toBeVisible();
    await expect(sheetEl).toHaveClass(/\bstarwarsffg\b/);
    await expect(sheetEl).toHaveClass(/\bitem\b/);
    await expect(sheetEl.locator('.window-content')).not.toBeEmpty();

    await api.closeSheet(page, uuid);
    await expect(sheetEl).toHaveCount(0);
  });
}
