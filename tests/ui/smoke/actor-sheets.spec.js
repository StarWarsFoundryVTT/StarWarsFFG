import { test, expect } from '../../support/fixtures';
import * as api from '../../support/api';
import { ACTOR_CASES, ACTOR_TYPES } from './sheet-matrix';

/**
 * Every registered actor sheet opens for every type it claims to support.
 *
 * Deliberately shallow - it renders the sheet and asserts nothing threw. The console guard in the
 * fixture does the rest
 */

test('the matrix covers every actor type', () => {
  expect(ACTOR_TYPES).toHaveLength(6);
  expect(ACTOR_CASES).toHaveLength(14);
});

test('the matrix matches what the system actually registers', async ({ page, world }) => {
  // A hardcoded count only catches new *types*. This catches a new *sheet* - register one in
  // swffg-main.js without adding it here and the matrix silently stops being complete.
  const missing = [];
  for (const type of ACTOR_TYPES) {
    const uuid = world.track(await api.createActor(page, { type, name: `smoke-registry-${type}` }));
    const registered = (await api.registeredSheets(page, 'Actor', type)).filter((id) => id.startsWith('ffg.'));
    const covered = ACTOR_CASES.filter((c) => c.type === type).map((c) => c.sheet.id);
    for (const id of registered) {
      if (!covered.includes(id)) missing.push(`${type}: ${id} is registered but not in the matrix`);
    }
  }
  expect(missing).toEqual([]);
});

for (const { type, sheet } of ACTOR_CASES) {
  test(`${sheet.label} opens for ${type}`, async ({ page, world }) => {
    // Created the way the sidebar dialog does: sheet pinned up front, renderSheet: true.
    const uuid = world.track(
      await api.createActor(page, {
        type,
        name: `smoke-${type}-${sheet.id}`,
        sheetClass: sheet.id,
        renderSheet: true,
      }),
    );

    const windowId = await api.openSheet(page, uuid);
    const sheetEl = page.locator(`#${windowId}`);

    await expect(sheetEl).toBeVisible();
    // the system's own classes, so a core sheet rendering instead would be caught
    await expect(sheetEl).toHaveClass(/\bstarwarsffg\b/);
    await expect(sheetEl).toHaveClass(/\bactor\b/);
    // an empty window means the template failed to produce anything
    await expect(sheetEl.locator('.window-content')).not.toBeEmpty();

    await api.closeSheet(page, uuid);
    await expect(sheetEl).toHaveCount(0);
  });
}
