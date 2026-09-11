import { test, expect } from '../../support/fixtures';

/**
 * Every reader of a modifier must agree it happened - at every depth it can be placed.
 */

const DELTA = 2;
const BASE = { actor: 'character', item: 'armour', equipped: true };

/** The same item without the modifier under test, for the before-and-after comparison. */
async function plain(world, consumers, label) {
  return consumers.read(await world.build({ ...BASE, label: `${label}-plain` }), 'Soak');
}

test('D1: every reader sees a soak modifier written straight onto the item', async ({ world, consumers }) => {
  const before = await plain(world, consumers, 'd1');
  const after = await consumers.read(await world.build({
    ...BASE,
    label: 'd1',
    attributes: [{ modtype: 'Stat', mod: 'Soak', value: DELTA }],
  }), 'Soak');

  expect({ before, after }).toBeCoherent(DELTA);
});

test.fixme('D2: every reader sees a soak modifier in a quality on the item', async ({ world, consumers }) => {
  const before = await plain(world, consumers, 'd2');
  const after = await consumers.read(await world.build({
    ...BASE,
    label: 'd2',
    modifier: { name: 'qa soak quality', key: 'Soak', value: DELTA, active: true },
  }), 'Soak');

  // FIXME: this is currently not adjusted (#2292)
  expect({ before, after }).toBeCoherent(DELTA);
});

test.fixme('D3: every reader sees a soak modifier in a Modification inside an attachment', async ({ world, consumers }) => {
  /*
   * Also expected to fail on itemAdjusted, for a different reason: the attachment loop does ask
   * for this key, but hands the Modifications to getCalculatedValueFromItems, which computes a
   * total and then returns 0 unless `includeSource` is set (modifiers.js:173). Same symptom as D2,
   * different cause, different fix - see d3/attachment-modifications.spec.js.
   */
  const before = await plain(world, consumers, 'd3');
  const after = await consumers.read(await world.build({
    ...BASE,
    label: 'd3',
    attachment: {
      name: 'insert',
      modifications: [{ name: 'qa soak quality', key: 'Soak', value: DELTA, installed: true }],
    },
  }), 'Soak');

  // FIXME: this is currently not adjusted (#2293)
  expect({ before, after }).toBeCoherent(DELTA);
});
