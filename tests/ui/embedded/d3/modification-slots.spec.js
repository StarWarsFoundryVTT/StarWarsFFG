import { test, expect } from '../../../support/fixtures';
import * as api from '../../../support/api';

/**
 * A Modification on an attachment tracks each install attempt as unmodified, modified, or failed,
 * and applies once per modified one (#2103). Modifications built here start out from before slots,
 * so each test also covers the editor bringing one forward.
 */

const MOD = 'system.itemattachment.0.system.itemmodifier.0';

test('#2103 two modified slots apply the Modification twice', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'weapon',
    equipped: true,
    attachment: {
      name: 'barrel',
      modifications: [{ name: 'qa damage', key: 'damage', modtype: 'Weapon Stat', value: 1 }],
    },
  });

  await world.setModificationSlots(ctx, 0, ['modified', 'modified']);

  expect(await consumers.itemAdjusted(ctx, 'Damage'), 'two installs of +1 damage').toBe(6 + 2);
});

test('#2103 a failed slot contributes nothing', async ({ world, page, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'weapon',
    equipped: true,
    attachment: {
      name: 'barrel',
      modifications: [{ name: 'qa damage', key: 'damage', modtype: 'Weapon Stat', value: 1 }],
    },
  });

  await world.setModificationSlots(ctx, 0, ['modified', 'failed']);

  expect(await consumers.itemAdjusted(ctx, 'Damage'), 'only the one that went in').toBe(6 + 1);
  const slots = await api.read(page, ctx.item, `${MOD}.system.slots`);
  expect(slots, 'the failure is kept').toEqual(['modified', 'failed']);
});

test('#2103 a Modification with no modified slot is not installed', async ({ world, page, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'weapon',
    equipped: true,
    attachment: {
      name: 'barrel',
      modifications: [
        { name: 'qa accurate', key: 'damage', modtype: 'Weapon Stat', value: 1, installed: true },
      ],
    },
  });

  await world.setModificationSlots(ctx, 0, ['failed', 'unmodified']);

  expect(await api.read(page, ctx.item, `${MOD}.system.active`), 'no longer installed').toBe(false);
  expect(await consumers.qualityRank(ctx, 'qa accurate'), 'so the quality is gone').toBeNull();
  expect(await consumers.itemAdjusted(ctx, 'Damage'), 'and so is its damage').toBe(6);
});

test('#2103 each modified slot adds a rank of its quality', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'weapon',
    equipped: true,
    attachment: {
      name: 'barrel',
      modifications: [
        { name: 'qa pierce', key: 'critical', modtype: 'Weapon Stat', value: 0, rank: 1 },
      ],
    },
  });

  await world.setModificationSlots(ctx, 0, ['modified', 'modified', 'unmodified']);

  expect(await consumers.qualityRank(ctx, 'qa pierce'), 'one rank per install').toBe(2);
});

test('#2103 modified slots on an armour attachment reach the actor', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'armour',
    equipped: true,
    attachment: {
      name: 'plate',
      modifications: [{ name: 'qa reinforced', key: 'Soak', value: 1 }],
    },
    itemOverrides: { soak: { value: 0, adjusted: 0 } },
  });

  await world.setModificationSlots(ctx, 0, ['modified', 'modified']);

  expect(await consumers.itemAdjusted(ctx, 'Soak'), 'the armour totals both installs').toBe(2);
  expect(await consumers.stat(ctx, 'Soak'), 'brawn 3 and two installs of +1').toBe(3 + 2);
});

test('#2103 modified slots add to the roll pool once each', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'weapon',
    equipped: true,
    attachment: {
      name: 'scope',
      modifications: [{ name: 'qa boosted', key: 'Add Boost', modtype: 'Roll Modifiers', value: 1 }],
    },
  });

  await world.setModificationSlots(ctx, 0, ['modified', 'modified']);

  const pool = await consumers.poolDice(ctx);
  expect(pool.boost, 'a boost die per install').toBe(2);
});

test('#2103 a ranked Modification from before slots keeps its total', async ({ world, page, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'weapon',
    equipped: true,
    attachment: {
      name: 'barrel',
      modifications: [
        { name: 'qa damage', key: 'damage', modtype: 'Weapon Stat', value: 1, rank: 2, installed: true },
      ],
    },
  });

  expect(await consumers.itemAdjusted(ctx, 'Damage'), 'two ranks before it is edited').toBe(6 + 2);

  // its rank was how many times it could be installed, so it opens as that many installed slots
  await world.setModificationSlots(ctx, 0, ['modified', 'modified']);

  expect(await api.read(page, ctx.item, `${MOD}.system.rank`), 'each slot is one rank').toBe(1);
  expect(await consumers.itemAdjusted(ctx, 'Damage'), 'still two after').toBe(6 + 2);
});

test('#2103 the next mod gets harder and dearer per install, not per attempt', async ({ world, page }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'weapon',
    equipped: true,
    attachment: {
      name: 'barrel',
      modifications: [{ name: 'qa damage', key: 'damage', modtype: 'Weapon Stat', value: 1 }],
    },
  });

  await world.setModificationSlots(ctx, 0, ['modified', 'failed', 'modified']);

  const next = await page.evaluate(async ({ uuid }) => {
    const path = '/systems/starwarsffg/modules/helpers/modifiers.js';
    const { default: ModifierHelpers } = await import(/* @vite-ignore */ path);
    const item = await fromUuid(uuid);
    return ModifierHelpers.nextModAttempt(item.system.itemattachment[0]);
  }, { uuid: ctx.item });

  // Hard, plus one step and 100 credits per mod already installed (FaD p.192)
  expect(next, 'two installed of three attempted').toEqual({ difficulty: 5, cost: 300 });
});
