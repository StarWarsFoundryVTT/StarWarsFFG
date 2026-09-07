import { test, expect } from '../../../support/fixtures';

/**
 * The same item, created four different ways, must reach the actor identically.
 */

test('armour soak reaches the actor the same way from every origin', async ({ world, consumers }) => {
  for (const origin of ['sidebar', 'compendium', 'import']) {
    const ctx = await world.build({
      actor: 'character', item: 'armour', origin, equipped: true, label: origin,
    });
    expect(await consumers.stat(ctx, 'Soak'), origin).toBe(3 + 2);  // Brawn + armour
  }

  const ctx = await world.build({
    actor: 'character', item: 'armour', origin: 'in-sheet', equipped: true,
  });
  // this fails since creating items on the actor doesn't trigger AE creation
  expect(await consumers.stat(ctx, 'Soak')).toBe(3 + 2);          // Brawn + armour
});

test('weapon encumbrance reaches the actor the same way from every origin', async ({ world, consumers }) => {
  for (const origin of ['sidebar', 'compendium', 'import']) {
    const ctx = await world.build({
      actor: 'character', item: 'weapon', origin, equipped: true, label: origin,
    });
    expect(await consumers.stat(ctx, 'Encumbrance'), origin).toBe(1);
  }

  const ctx = await world.build({
    actor: 'character', item: 'weapon', origin: 'in-sheet', equipped: true,
  });
  expect(await consumers.stat(ctx, 'Encumbrance')).toBe(1);
});

test('gear encumbrance reaches the actor the same way from every origin', async ({ world, consumers }) => {
  for (const origin of ['sidebar', 'compendium', 'import']) {
    const ctx = await world.build({
      actor: 'character', item: 'gear', origin, label: origin,
    });
    expect(await consumers.stat(ctx, 'Encumbrance'), origin).toBe(2);
  }

  const ctx = await world.build({
    actor: 'character', item: 'gear', origin: 'in-sheet',
  });
  expect(await consumers.stat(ctx, 'Encumbrance')).toBe(2);
});
