import { test, expect } from '../../support/fixtures';

/**
 * The NPC generator's engine: presets merge, queries weight rather than filter, and a draft follows
 * the rules for its type and tier. Most tests run on small made-up content, so they can't pass by luck.
 * The last one builds a real Actor from the seeded world's species and armor
 */

const ROOT = '/systems/starwarsffg/modules/helpers';
const ENGINE = `${ROOT}/npc-generator-engine.js`;
const PRESETS = `${ROOT}/npc-generator-presets.js`;

const weapon = (name, skill, range, tags, rarity = 3) => ({
  name: name,
  type: 'weapon',
  system: {
    skill: { value: skill },
    range: { value: range },
    rarity: { value: rarity },
    metadata: { tags: tags },
  },
});

const ARSENAL = [
  weapon('qa long rifle', 'Ranged: Heavy', 'Long', ['rifle', 'blaster']),
  weapon('qa carbine', 'Ranged: Heavy', 'Medium', ['carbine', 'blaster']),
  weapon('qa pistol', 'Ranged: Light', 'Short', ['pistol', 'blaster']),
  weapon('qa grenade', 'Ranged: Light', 'Short', ['grenade']),
  weapon('qa vibroknife', 'Melee', 'Engaged', ['cutting edge melee']),
];

const TALENTS = [
  { name: 'Adversary', type: 'talent', system: { ranks: { ranked: true } } },
  { name: 'Brace', type: 'talent', system: { ranks: { ranked: true } } },
];

/** The entries of a tier table that a roll at `tier` can land on: its own percentile and one either side */
async function band(page, type, key, tier) {
  return page.evaluate(({ type, key, tier }) => {
    const table = CONFIG.FFG.npcGenerator.tiers[type][key];
    const centre = (tier - 1) * 2;
    return table.slice(Math.max(0, centre - 1), centre + 2);
  }, { type, key, tier });
}

/** Generates in the page from made-up content. `raw` holds plain item, species, and talent data */
async function generate(page, options, raw = {}) {
  return page.evaluate(async ({ engine, options, raw }) => {
    const { generate, reroll, toEntry } = await import(engine);
    const content = {
      items: (raw.items ?? []).map((r, i) => toEntry(r, `qa.item.${i}`)),
      species: (raw.species ?? []).map((r, i) => toEntry(r, `qa.species.${i}`)),
      talents: new Map((raw.talents ?? []).map((r, i) => [r.name.toLowerCase(), toEntry(r, `qa.talent.${i}`)])),
    };
    const { reroll: again, ...rest } = options;
    const draft = await generate({ content, ...rest });
    const first = JSON.parse(JSON.stringify(draft));
    if (!again) return { first };
    draft.locks = again.locks;
    await reroll(draft, again.step, content);
    return { first, rerolled: JSON.parse(JSON.stringify(draft)) };
  }, { engine: ENGINE, options, raw });
}

test('a low-tech medic keeps the medic job and steers every gear slot away from blasters', async ({ page }) => {
  const recipe = await page.evaluate(async (path) => {
    const { resolvePreset } = await import(path);
    const r = resolvePreset('medic', ['lowTech']);
    return {
      medicine: r.skills.Medicine,
      survival: r.skills.Survival,
      rarity: r.rarity,
      slots: Object.keys(r.gear),
      blasters: Object.values(r.gear).map((slot) => slot.odds.blaster),
      tags: r.tags,
    };
  }, PRESETS);

  expect(recipe.medicine, 'the medic still leads with Medicine').toBe(5);
  expect(recipe.survival, 'low-tech adds Survival').toBe(1);
  expect(recipe.rarity, 'low-tech lowers the rarity cap by two').toBe(-2);
  expect(recipe.blasters, 'every slot avoids blasters').toEqual(recipe.slots.map(() => 0.15));
  expect(recipe.tags).toEqual(['medic', 'low-tech']);
});

test('modifiers stack in order', async ({ page }) => {
  const recipe = await page.evaluate(async (path) => {
    const { resolvePreset } = await import(path);
    const kit = { types: ['gear'], odds: { rifle: 2 } };
    const archetype = { label: 'qa', gear: { kit: kit } };
    const r = resolvePreset(archetype, [
      { restricted: true, tags: ['first'], skills: { Cool: 1 }, gear: { spare: { types: ['gear'] } } },
      { restricted: false, tags: ['second'], skills: { Cool: 2 }, odds: { rifle: 3 } },
    ]);
    return {
      restricted: r.restricted, tags: r.tags, cool: r.skills.Cool,
      slots: Object.keys(r.gear), rifle: r.gear.kit.odds.rifle, spareRifle: r.gear.spare.odds.rifle,
    };
  }, PRESETS);

  expect(recipe.restricted, 'the later modifier wins').toBe(false);
  expect(recipe.tags, 'tags from both').toEqual(['first', 'second']);
  expect(recipe.cool, 'skill weights add up').toBe(3);
  expect(recipe.slots, 'a modifier can add a slot').toEqual(['kit', 'spare']);
  expect(recipe.rifle, 'odds for the same tag multiply').toBe(6);
  expect(recipe.spareRifle, "a modifier's odds reach every slot").toBe(3);
});

test('a sniper always carries the long-range weapon for its best combat skill', async ({ page }) => {
  for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
    const { first } = await generate(
      page, { archetype: 'sniper', type: 'rival', tier: 3, species: false, seed: seed }, { items: ARSENAL });
    const primary = first.items.find((item) => item.slot === 'primary');
    const sidearm = first.items.find((item) => item.slot === 'sidearm');
    expect(first.skills['Ranged: Heavy'].rank, `seed ${seed}: the sniper's own skill is its best`).toBe(3);
    expect(primary?.name, `seed ${seed}: only one Ranged: Heavy weapon reaches Long`).toBe('qa long rifle');
    expect(sidearm?.name ?? 'qa pistol', `seed ${seed}: a sidearm is never a grenade`).toBe('qa pistol');
  }
});

test('a seed repeats its NPC', async ({ page }) => {
  const options = { archetype: 'soldier', type: 'rival', tier: 3, species: false, seed: 77 };
  const { first: once } = await generate(page, options, { items: ARSENAL });
  const { first: again, rerolled } = await generate(
    page, { ...options, reroll: { step: 'skills', locks: { gear: true } } }, { items: ARSENAL });

  expect(again, 'the same seed rolls the same NPC').toEqual(once);
  expect(rerolled.characteristics, 'steps before the rerolled one are kept').toEqual(once.characteristics);
  expect(rerolled.items, 'a locked section is kept').toEqual(once.items);
  expect(rerolled.rolls, 'the reroll is counted against its step').toEqual({ skills: 1 });
});


test('a created NPC holds its species and shows the stats it was rolled with', async ({ page, world }) => {
  const made = await page.evaluate(async (path) => {
    const g = await import(path);
    const content = await g.loadContent();
    const human = content.species.find((s) => s.name === 'Human');
    const draft = await g.generate({
      content, archetype: 'soldier', type: 'rival', tier: 3, species: human.uuid, seed: 11,
    });
    const actor = await g.createActor(draft);
    const s = actor.system;
    return {
      uuid: actor.uuid,
      wanted: { characteristics: draft.characteristics, ...draft.stats },
      prepared: {
        characteristics: Object.fromEntries(Object.entries(s.characteristics).map(([k, v]) => [k, v.value])),
        soak: s.stats.soak.value,
        defence: s.stats.defence.ranged,
        wounds: s.stats.wounds.max,
      },
      species: actor.items.filter((i) => i.type === 'species').map((i) => i.name),
      armour: actor.items.filter((i) => i.type === 'armour').map((i) => i.system.equippable.equipped),
      items: draft.items.length + draft.talents.length + 1,
      held: actor.items.size,
    };
  }, ENGINE);
  world.track(made.uuid);

  expect(made.species, 'the species item is attached').toEqual(['Human']);
  expect(made.prepared, 'species and armour effects do not stack on top of the roll').toEqual(made.wanted);
  expect(made.armour, 'armour is worn').toEqual([true]);
  expect(made.held, 'every rolled item and talent, plus the species').toBe(made.items);
});
