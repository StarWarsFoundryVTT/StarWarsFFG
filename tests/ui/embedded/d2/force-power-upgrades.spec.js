import { test, expect } from '../../../support/fixtures';

/**
 * Upgrades inside a force power or signature ability - the only two item types that have them.
 */

const CASES = [
  { item: 'forcepower',       stat: 'Wounds', baseline: 12, value: 2 },
  { item: 'signatureability', stat: 'Strain', baseline: 13, value: 1 },
];

for (const c of CASES) {
  test(`a learned ${c.item} upgrade raises ${c.stat} by ${c.value}`, async ({ world, consumers }) => {
    const ctx = await world.build({
      actor: 'character',
      item: c.item,
      talents: [
        // an unlearned node first, to prove it is skipped rather than merely absent
        { name: 'qa unlearned', islearned: false,
          attributes: [{ modtype: 'Stat', mod: 'Soak', value: 3 }] },
        { name: 'qa learned',
          attributes: [{ modtype: 'Stat', mod: c.stat, value: c.value }] },
      ],
    });

    expect(await consumers.stat(ctx, c.stat), 'learned node increases stat')
      .toBe(c.baseline + c.value);
    expect(await consumers.stat(ctx, 'Soak'), 'unlearned node contributes nothing')
      .toBe(3);
  });
}

test('learning an upgrade activates its modifiers', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'forcepower',
    talents: [
      { name: 'qa upgrade', islearned: false,
        attributes: [{ modtype: 'Stat', mod: 'Wounds', value: 2 }] },
    ],
  });

  expect(await consumers.stat(ctx, 'Wounds'), 'before it is learned').toBe(12);

  await world.learn(ctx, 0);

  expect(await consumers.stat(ctx, 'Wounds'), 'once learned').toBe(12 + 2);
});

test('unlearning an upgrade suspends its modifiers', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'forcepower',
    talents: [
      { name: 'qa upgrade', attributes: [{ modtype: 'Stat', mod: 'Wounds', value: 2 }] },
    ],
  });

  expect(await consumers.stat(ctx, 'Wounds'), 'while learned').toBe(12 + 2);

  await world.learn(ctx, 0, false);

  expect(await consumers.stat(ctx, 'Wounds'), 'once unlearned').toBe(12);
});

test('two learned upgrades on one force power both apply', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'forcepower',
    talents: [
      { name: 'qa first',  attributes: [{ modtype: 'Stat', mod: 'Wounds', value: 2 }] },
      { name: 'qa second', attributes: [{ modtype: 'Stat', mod: 'Strain', value: 1 }] },
    ],
  });

  expect(await consumers.stat(ctx, 'Wounds'), 'from the first upgrade').toBe(12 + 2);
  expect(await consumers.stat(ctx, 'Strain'), 'from the second upgrade').toBe(13 + 1);
});

test('an upgrade modifier shows on the send-to-chat card', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'forcepower',
    talents: [
      { name: 'qa learned',   attributes: [{ modtype: 'Stat', mod: 'Wounds', value: 2 }] },
      { name: 'qa unlearned', islearned: false,
        attributes: [{ modtype: 'Stat', mod: 'Strain', value: 1 }] },
    ],
  });

  expect(await consumers.chatCard(ctx, 'qa learned'), 'the learned upgrade is listed').toBe(true);
  expect(await consumers.chatCard(ctx, 'qa unlearned'), 'the unlearned one is not').toBe(false);
});
