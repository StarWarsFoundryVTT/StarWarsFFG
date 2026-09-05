/**
 * Realistic items and actors with known values.
 */

export interface ItemFixture {
  type: string;
  /** OggDude key, for finding the imported twin of this item. */
  importId: string;
  /** Compendium the importer files it under - see SEED_PACKS. */
  pack: string;
  /** Baselines a test can assert against without re-deriving them. */
  baseline: Record<string, number | string>;
  system: Record<string, unknown>;
}

/** Gives the chat-card reader something to find. */
const describe = (what: string) => `<p>QA fixture: ${what}. Not for play.</p>`;

/**
 * Fields every gear item carries.
 */
const gearBase = (what: string, tags: string[]) => ({
  description: describe(what),
  attributes: {},
  itemmodifier: [],
  itemattachment: [],
  adjusteditemmodifer: [],
  equippable: { value: true, equipped: false },
  metadata: { tags, sources: ['QA'] },
});

export const ITEMS: Record<string, ItemFixture> = {
  /** Mirrors ARMROBE (Armored Robes) */
  armour: {
    type: 'armour',
    importId: 'ARMROBE',
    pack: 'oggdude.Armor',
    baseline: { soak: 2, defence: 1, encumbrance: 5, hardpoints: 2 },
    system: {
      ...gearBase('armour', ['armor']),
      soak: { value: 2, adjusted: 2 },
      defence: { value: 1, adjusted: 1 },
      encumbrance: { value: 5, adjusted: 5 },
      hardpoints: { value: 2, adjusted: 2 },
      price: { value: 4500, adjusted: 4500 },
      rarity: { value: 8, isrestricted: true },
    },
  },

  /** Mirrors BLASTPIS (Blaster Pistol). */
  weapon: {
    type: 'weapon',
    importId: 'BLASTPIS',
    pack: 'oggdude.Weapons',
    baseline: { damage: 6, crit: 3, encumbrance: 1, hardpoints: 3, range: 'Medium' },
    system: {
      ...gearBase('weapon', ['weapon']),
      // must name a skill the actor actually has, or rollItem throws on
      // actor.system.skills[itemData.skill.value]
      skill: { value: 'Ranged: Light' },
      damage: { value: 6, adjusted: 6 },
      crit: { value: 3, adjusted: 3 },
      range: { value: 'Medium', adjusted: 'Medium' },
      encumbrance: { value: 1, adjusted: 1 },
      hardpoints: { value: 3, adjusted: 3 },
      price: { value: 400, adjusted: 400 },
      rarity: { value: 4, isrestricted: false },
      special: { value: '' },
      ammo: { value: 10, max: 10 },
    },
  },

  /** Mirrors MEDPAC. Non-zero encumbrance, so it shows up in the actor's carried total. */
  gear: {
    type: 'gear',
    importId: 'MEDPAC',
    pack: 'oggdude.Gear',
    baseline: { encumbrance: 2 },
    system: {
      ...gearBase('gear', ['gear']),
      encumbrance: { value: 2, adjusted: 2 },
      price: { value: 400, adjusted: 400 },
      rarity: { value: 2, isrestricted: false },
    },
  },

  /** No imported twin - the trimmed dataset has no vehicle weapons yet. */
  shipweapon: {
    type: 'shipweapon',
    importId: '',
    pack: '',
    baseline: { damage: 6, crit: 4, hardpoints: 3 },
    system: {
      ...gearBase('ship weapon', ['weapon']),
      skill: { value: 'Gunnery' },
      damage: { value: 6, adjusted: 6 },
      crit: { value: 4, adjusted: 4 },
      range: { value: 'Close', adjusted: 'Close' },
      hardpoints: { value: 3, adjusted: 3 },
      encumbrance: { value: 0, adjusted: 0 },
      price: { value: 900, adjusted: 900 },
      rarity: { value: 6, isrestricted: false },
    },
  },
};

/**
 * An attachment as it sits inside `item.system.itemattachment[]`. Not a document - no id,
 * no hooks. Shaped like what the item sheet produces, since that's where most reports come from.
 */
export function attachmentFixture(name: string) {
  return {
    name,
    type: 'itemattachment',
    img: 'icons/svg/upgrade.svg',
    system: {
      description: describe('attachment'),
      active: true,
      hardpoints: { value: 1, adjusted: 1 },
      price: { value: 250, adjusted: 250 },
      rarity: { value: 3, isrestricted: false },
      attributes: {},
      itemmodifier: [],
      itemattachment: [],
      adjusteditemmodifer: [],
      metadata: { tags: ['attachment'], sources: ['QA'] },
    },
  };
}

export interface ModifierSpec {
  name: string;
  /** As the system spells it: "Soak", "Defence-Ranged", "Damage", "Wounds". */
  key: string;
  value: number;
  /** "Stat", "Characteristic", "Weapon Stat", "Skill Rank". Defaults to "Stat". */
  modtype?: string;
  /** The flag `item-ffg.js` filters nested modifiers on. Defaults true. */
  active?: boolean;
  rank?: number;
}

/**
 * A modifier as it sits inside `system.itemmodifier[]`. `attributes` is numerically keyed
 * because that's what the sheets emit; the key is repeated as `mod` and `key` because
 * different consumers read different ones.
 */
export function modifierFixture(m: ModifierSpec) {
  return {
    name: m.name,
    type: 'itemmodifier',
    img: 'icons/svg/aura.svg',
    system: {
      description: describe(`modifier ${m.key} +${m.value}`),
      active: m.active ?? true,
      rank: m.rank ?? 1,
      rank_current: m.rank ?? 1,
      attributes: {
        '0': {
          modtype: m.modtype ?? 'Stat',
          mod: m.key,
          key: m.key,
          value: m.value,
        },
      },
      itemmodifier: [],
      adjusteditemmodifer: [],
      metadata: { tags: ['modifier'], sources: ['QA'] },
    },
  };
}

/**
 * Characteristics are all different, so a consumer reading the wrong one is obvious.
 * Brawn 3 gives soak and the wound threshold a non-zero base.
 */
export const ACTORS: Record<string, { type: string; baseline: Record<string, number>; system: Record<string, unknown> }> = {
  character: {
    type: 'character',
    baseline: { Brawn: 3, Agility: 2, Intellect: 4, Cunning: 1, Willpower: 2, Presence: 1 },
    system: {
      characteristics: {
        Brawn: { value: 3 }, Agility: { value: 2 }, Intellect: { value: 4 },
        Cunning: { value: 1 }, Willpower: { value: 2 }, Presence: { value: 1 },
      },
      // ranks so weapon rolls produce a real pool rather than an empty one
      skills: {
        'Ranged: Light': { rank: 2 },
        'Gunnery': { rank: 1 },
        'Piloting: Space': { rank: 1 },
      },
      stats: { credits: { value: 500 } },
    },
  },

  minion: {
    type: 'minion',
    baseline: { Brawn: 2, Agility: 2, Intellect: 1, Cunning: 1, Willpower: 1, Presence: 1 },
    system: {
      characteristics: {
        Brawn: { value: 2 }, Agility: { value: 2 }, Intellect: { value: 1 },
        Cunning: { value: 1 }, Willpower: { value: 1 }, Presence: { value: 1 },
      },
      quantity: { value: 3 },
    },
  },

  vehicle: {
    type: 'vehicle',
    baseline: { silhouette: 3, handling: 1, armour: 2, hullTrauma: 15, systemStrain: 12 },
    system: {
      stats: {
        silhouette: { value: 3 },
        speed: { value: 4, max: 4 },
        handling: { value: 1 },
        armour: { value: 2, adjusted: 2 },
        hullTrauma: { value: 0, min: 0, max: 15 },
        systemStrain: { value: 0, min: 0, max: 12 },
        shields: { fore: 1, port: 0, starboard: 0, aft: 1 },
        customizationHardPoints: { value: 5 },
        encumbrance: { value: 0, min: 0, max: 20, adjusted: 20 },
        sensorRange: { value: 'Medium' },
      },
    },
  },
};
