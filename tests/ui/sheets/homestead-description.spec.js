import { test, expect } from '../../support/fixtures';
import * as api from '../../support/api';

/**
 * A homestead's description renders dice tags as symbols, the same as other actor sheets.
 */

test('#2358 dice tags in a homestead description render as dice', async ({ world, page }) => {
  const uuid = world.track(
    await api.createActor(page, {
      type: 'homestead',
      name: 'qa-homestead-dice',
      system: {
        biography: '<p>[AB] [DI]</p>',
      },
    }),
  );
  const sheet = page.locator(`#${await api.openSheet(page, uuid)}`);
  const description = sheet.locator('.biography-editor');

  await expect(description.locator('.dietype.ability'), 'the ability die').toHaveCount(1);
  await expect(description.locator('.dietype.difficulty'), 'the difficulty die').toHaveCount(1);
  await expect(description, 'no raw tags left').not.toContainText('[AB]');
});
