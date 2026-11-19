import { test, expect } from '../../support/fixtures';
import * as api from '../../support/api';

/**
 * Expanding a talent on the character sheet shows what it does.
 */

test('#2265 an expanded talent shows both its short and long description', async ({ world, page }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'talent',
    itemOverrides: {
      description: 'qa short description',
      longDesc: 'qa long description',
    },
  });
  const sheet = page.locator(`#${await api.openSheet(page, ctx.actor)}`);

  await sheet.getByTitle('Talents').click();
  await sheet.locator(`.talents li.item[data-item-name="${ctx.itemName}"] .item-name`).click();

  const details = sheet.locator('.talents .item-details');

  await expect(details, 'the short description').toContainText('qa short description');
  await expect(details, 'and the long one').toContainText('qa long description');
});
