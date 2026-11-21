import { test, expect } from '../../support/fixtures';
import * as api from '../../support/api';

/**
 * #2372: `characteristicDiceMods` turned on offers the characteristic dice mod types on the sheets.
 */

test('#2372 the sheet offers characteristic dice mods with the setting on', async ({ world, page }) => {
  await world.setSetting('characteristicDiceMods', true);

  const ctx = await world.build({
    actor: 'character',
    item: 'gear',
    attributes: [{
      modtype: 'Stat',
      mod: 'Strain',
      value: 1,
    }],
  });

  expect(await api.readModifierTypeOptions(page, ctx.item)).toContain('Characteristic Setback');
});
