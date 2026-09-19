import { test, expect } from '../../support/fixtures';
import * as api from '../../support/api';
import * as oggdude from '../../support/oggdude';
import * as itemSheet from '../../support/pages/item-sheet';

/**
 * Whether a sheet shows what its document carries.
 */

test.fixme('#2268 an imported talent shows its source on the sheet', async ({ world, page }) => {
  const grit = await oggdude.record(page, 'Talents.xml', 'GRIT');
  const talent = await world.imported('talent');
  const first = grit.Sources.Source[0];
  const book = `${first._} pg.${first.$Page}`;

  const recorded = await api.read(page, talent, 'system.metadata.sources');

  expect(recorded, 'the import recorded the books').toContain(book);

  await api.openSheet(page, talent);

  // FIXME: #2268
  expect(await itemSheet.sources(page, 'Grit'), 'and the sources tab lists them').toContain(book);
});
