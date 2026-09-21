import { test, expect } from '../../support/fixtures';
import * as api from '../../support/api';
import { covering } from '../../support/pages/hit-testing';

/**
 * #2075 - the split control's tooltip is laid out even while hidden, and sits over the
 * description's edit button on a combined box.
 */
test('#2075 a combined force power box can still be edited', async ({ page, world }) => {
  const power = await world.item({
    item: 'forcepower',
    itemOverrides: {
      isEditing: true,
    },
  });
  const sheet = page.locator(`#${await api.openSheet(page, power)}`);

  await sheet.locator('[data-action="combine"][data-key="upgrade0"]').click();
  await expect.poll(
    () => api.read(page, power, 'system.upgrades.upgrade0.size'),
    { message: 'the pair combined' }
  ).toBe('double');

  const editor = sheet.locator('#upgrade0 .popout-editor');
  await editor.hover();
  const button = editor.locator('.popout-editor-button');

  expect(await covering(button), 'nothing is layered over the edit button').toBeNull();

  await button.click();
  await expect(page.locator('#popout-editor'), 'the editor opens').toBeVisible();

  await page.locator('#popout-editor .header-button.close, #popout-editor [data-action="close"]').first().click();
  await api.closeSheet(page, power);
});
