import { test, expect } from '../../support/fixtures';
import * as api from '../../support/api';

/**
 * The currency box on an actor sheet is titled from the world's currency name setting.
 */

async function currencyTitle(page, actor) {
  const id = await api.openSheet(page, actor);
  const title = page.locator(`#${id} [class~="data.stats.credits.value"] .block-title`);
  return ((await title.textContent()) ?? '').trim();
}

test('#2245 the currency box defaults to credits', async ({ world, page }) => {
  const actor = await world.actor({ actor: 'character' });

  expect(await currencyTitle(page, actor), 'an unchanged world still says credits').toBe('Credits');
});

test('#2245 a renamed currency titles the currency box', async ({ world, page }) => {
  await world.setSetting('currency-name', 'Gold');
  const actor = await world.actor({ actor: 'character' });

  expect(await currencyTitle(page, actor), 'the sheet uses the configured name').toBe('Gold');
});
