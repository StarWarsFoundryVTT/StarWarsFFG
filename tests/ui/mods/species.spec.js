import { test, expect } from '../../support/fixtures';

/**
 * A species sets characteristics and derived thresholds on the character.
 */

const SPECIES = [
  { key: 'Brawn',     modtype: 'Characteristic', value: 1 },
  { key: 'Agility',   modtype: 'Characteristic', value: 2 },
  { key: 'Intellect', modtype: 'Characteristic', value: 3 },
  { key: 'Cunning',   modtype: 'Characteristic', value: 3 },
  { key: 'Willpower', modtype: 'Characteristic', value: 2 },
  { key: 'Presence',  modtype: 'Characteristic', value: 1 },
  { key: 'Wounds',    modtype: 'Stat',           value: 10 },
  { key: 'Strain',    modtype: 'Stat',           value: 20 },
];

test('species characteristics and thresholds reach the actor', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'species',
    // the character fixture has its own characteristics; zero them so the species is the only source
    actorOverrides: {
      characteristics: {
        Brawn: { value: 0 }, Agility: { value: 0 }, Intellect: { value: 0 },
        Cunning: { value: 0 }, Willpower: { value: 0 }, Presence: { value: 0 },
      },
    },
    attributes: SPECIES.map((s) => ({ modtype: s.modtype, mod: s.key, value: s.value, key: s.key })),
  });

  for (const c of SPECIES.filter((s) => s.modtype === 'Characteristic')) {
    expect(await consumers.stat(ctx, c.key), `${c.key}`).toBe(c.value);
  }

  // thresholds are the species value plus the characteristic it keys off
  expect(await consumers.stat(ctx, 'Wounds'), 'wounds = 10 + brawn 1').toBe(11);
  expect(await consumers.stat(ctx, 'Strain'), 'strain = 20 + willpower 2').toBe(22);
});

test.fixme('soak picks up brawn from a species', async ({ world, consumers }) => {
  const ctx = await world.build({
    actor: 'character',
    item: 'species',
    actorOverrides: { characteristics: { Brawn: { value: 0 } } },
    attributes: [{ modtype: 'Characteristic', mod: 'Brawn', value: 1, key: 'Brawn' }],
  });
  expect(await consumers.stat(ctx, 'Soak')).toBe(1);
});
