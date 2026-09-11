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
  metadata: { tags, sources: ['QA'] },
});

const equippable = { equippable: { value: true, equipped: false } };

/**
 * The eight career-skill slots a career or specialization carries.
 */
const emptyCareerSkills = () =>
  Object.fromEntries(Array.from({ length: 8 }, (_, i) => [`careerSkill${i}`, '(none)']));

export const ITEMS: Record<string, ItemFixture> = {
  /** Mirrors ARMROBE (Armored Robes) */
  armour: {
    type: 'armour',
    importId: 'ARMROBE',
    pack: 'oggdude.Armor',
    baseline: { soak: 2, defence: 1, encumbrance: 5, hardpoints: 2 },
    system: {
      ...gearBase('armour', ['armor']),
      ...equippable,
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
      ...equippable,
      // both are dropdowns on the weapon sheet, so any submit writes them
      status: '',
      characteristic: { value: '' },
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

  /**
   * Types below carry only the `core` template
   */
  career: {
    type: 'career', importId: '', pack: '',
    baseline: {},
    system: { description: describe('career'), attributes: {}, metadata: { tags: ['career'], sources: ['QA'] },
              specializations: {}, signatureabilities: {}, careerSkills: emptyCareerSkills() },
  },

  talent: {
    type: 'talent', importId: 'GRIT', pack: 'oggdude.Talents',
    baseline: { tier: 1 },
    system: { description: describe('talent'), attributes: {}, metadata: { tags: ['talent'], sources: ['QA'] },
              activation: { value: 'Passive' }, ranks: { ranked: false, current: 1 },
              isForceTalent: false, isConflictTalent: false, tier: 1, trees: [], longDesc: '' },
  },

  criticalinjury: {
    type: 'criticalinjury', importId: '', pack: '',
    baseline: { severity: 1 },
    system: { description: describe('critical injury'), attributes: {},
              metadata: { tags: ['criticalinjury'], sources: ['QA'] },
              min: 1, max: 20, severity: 1 },
  },

  criticaldamage: {
    type: 'criticaldamage', importId: '', pack: '',
    baseline: { severity: 1 },
    system: { description: describe('critical damage'), attributes: {},
              metadata: { tags: ['criticaldamage'], sources: ['QA'] },
              min: 1, max: 20, severity: 1 },
  },

  species: {
    type: 'species', importId: '', pack: '',
    baseline: { startingXP: 100 },
    system: { description: describe('species'), attributes: speciesIntrinsics(),
              metadata: { tags: ['species'], sources: ['QA'] },
              talents: {}, abilities: {}, species: {}, startingXP: 100 },
  },

  specialization: {
    type: 'specialization', importId: '', pack: '',
    baseline: {},
    system: { isEditing: false,  description: describe('specialization'), attributes: {},
              metadata: { tags: ['specialization'], sources: ['QA'] },
              talents: {}, careerSkills: emptyCareerSkills(), universal: false },
  },

  /** Mirrors ARMINS (Armor Insert) - the attachment used for depth tests. */
  itemattachment: {
    type: 'itemattachment', importId: 'ARMINS', pack: 'oggdude.ArmorAttachments',
    baseline: { hardpoints: 1 },
    system: {
      ...gearBase('attachment', ['attachment']),
      hardpoints: { value: 1, adjusted: 1 },
      price: { value: 450, adjusted: 450 },
      rarity: { value: 3, isrestricted: false },
      type: 'all',
    },
  },

  itemmodifier: {
    type: 'itemmodifier', importId: '', pack: '',
    baseline: { rank: 1 },
    system: { description: describe('modifier'), attributes: {},
              metadata: { tags: ['modifier'], sources: ['QA'] },
              active: false, rank: 1, rank_current: 1, itemmodifier: [], adjusteditemmodifer: [] },
  },

  shipattachment: {
    type: 'shipattachment', importId: '', pack: '',
    baseline: { encumbrance: 5, hardpoints: 3 },
    system: {
      ...gearBase('ship attachment', ['attachment']),
      ...equippable,
      hardpoints: { value: 3, adjusted: 3 },
      encumbrance: { value: 5, adjusted: 5 },
      price: { value: 800, adjusted: 800 },
      rarity: { value: 4, isrestricted: false },
      label: 'QA Ship Attachment',
    },
  },

  forcepower: {
    type: 'forcepower', importId: '', pack: '',
    baseline: { base_cost: 10 },
    system: { isEditing: false,  description: describe('force power'), attributes: {},
              metadata: { tags: ['forcepower'], sources: ['QA'] },
              upgrades: {}, required_force_rating: 1, base_cost: 10 },
  },

  signatureability: {
    type: 'signatureability', importId: '', pack: '',
    baseline: { base_cost: 25 },
    system: { isEditing: false,  description: describe('signature ability'), attributes: {},
              metadata: { tags: ['signatureability'], sources: ['QA'] },
              upgrades: {}, base_cost: 25, uplink_nodes: {} },
  },

  /** No imported twin - the trimmed dataset has no vehicle weapons yet. */
  shipweapon: {
    type: 'shipweapon',
    importId: '',
    pack: '',
    baseline: { damage: 6, crit: 4, hardpoints: 3 },
    system: {
      ...gearBase('ship weapon', ['weapon']),
      ...equippable,
      // not in the shipweapon schema, but its sheet writes one on every submit
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

/**
 * A modifier written straight onto an item's own `system.attributes`, which is what the sheet's
 * modifier rows produce.
 */
export interface AttributeSpec {
  /** "Stat", "Characteristic", "Skill Add Advantage", "Vehicle Stat", "Skill Boost", … */
  modtype: string;
  /** What it modifies: "Soak", "Strain", "Gunnery", "Armor", "Brawn", … */
  mod: string;
  value: number | string;
  /** Storage key. Defaults to attr1, attr2, … Pass the mod name for intrinsic species values. */
  key?: string;
}

/**
 * The eight attributes every real species carries, keyed by name rather than `attrN`.
 *
 * The importer writes these from StartingChars and StartingAttrs
 * (importer/oggdude/importers/species.js:55-84), and a species made in the UI has the same eight,
 * so a species without them is a shape the system never produces. It also crashes on contact:
 * applyActiveEffectOnUpdate reaches into the inherent effect for the Brawn change and reads
 * `.value` off the result without checking (modifiers.js:763), and there is no Brawn change to
 * find unless a Brawn attribute created one.
 *
 * The values are zero deliberately. These changes apply with mode ADD, and the character fixture
 * is already a finished character - Brawn 3, soak 3 - so a species carrying real numbers would
 * move every stat it touches and make each expectation the sum of two fixtures rather than one.
 * A test that wants a species to contribute should say so through `attributes`.
 */
export function speciesIntrinsics(): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const c of ['Brawn', 'Agility', 'Intellect', 'Cunning', 'Willpower', 'Presence']) {
    out[c] = { modtype: 'Characteristic', mod: c, value: 0, exclude: true };
  }
  for (const stat of ['Wounds', 'Strain']) {
    out[stat] = { modtype: 'Stat', mod: stat, value: 0, exclude: true };
  }
  return out;
}

/** Turn a list of attribute specs into the numerically-keyed map the system expects. */
export function attributeMap(attrs: AttributeSpec[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  attrs.forEach((a, i) => {
    out[a.key ?? `attr${i + 1}`] = { modtype: a.modtype, mod: a.mod, value: a.value };
  });
  return out;
}

/**
 * A learned talent inside a specialization, or an upgrade inside a force power or signature
 * ability
 */
export interface TalentSpec {
  name: string;
  attributes: AttributeSpec[];
  /** Defaults to true; set false to check that an unpurchased talent stays inert. */
  islearned?: boolean;
  isRanked?: boolean;
}

/** Build the numerically-keyed talents/upgrades map a specialization or force power holds. */
export function talentMap(talents: TalentSpec[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  // Keys are unique across the whole item, not per node. The editor names each Active Effect
  // after its attribute key, so two nodes both using "attr1" would share one effect - and the
  // real keys are `attr<randomID>` (importers/careers.js:80), never per-node counters.
  let n = 0;
  talents.forEach((t, i) => {
    out[String(i)] = {
      name: t.name,
      description: describe(`talent ${t.name}`),
      islearned: t.islearned ?? true,
      isRanked: t.isRanked ?? false,
      // A real node always carries one, and the talent editor indexes CONFIG.FFG.activations
      // with it while building the label.
      activation: 'Passive',
      activationLabel: 'SWFFG.TalentActivationsPassive',
      attributes: attributeMap(t.attributes.map((a) => ({ ...a, key: a.key ?? `attr${++n}` }))),
    };
  });
  return out;
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
  /**
   * A plausible starting character: characteristics in the 1-4 range, and thresholds derived
   * from them the way a species grants them - wounds are a species base plus Brawn, strain a
   * species base plus Willpower.
   *
   * The thresholds are set rather than left at the schema default of 0, because 0 is a state no
   * played character is ever in and it changes behaviour: an actor at 0 wounds is already at its
   * threshold, so anything gating on being wounded misbehaves. It also makes a modifier's effect
   * ambiguous - with a zero base you cannot tell "added to nothing" from "base ignored".
   *
   * Wounds and strain differ (12 vs 13) on purpose, so a test reading the wrong one is visible.
   */
  character: {
    type: 'character',
    baseline: {
      Brawn: 3, Agility: 2, Intellect: 4, Cunning: 2, Willpower: 3, Presence: 1,
      Wounds: 12, Strain: 13, Soak: 3,
    },
    system: {
      characteristics: {
        Brawn: { value: 3 }, Agility: { value: 2 }, Intellect: { value: 4 },
        Cunning: { value: 2 }, Willpower: { value: 3 }, Presence: { value: 1 },
      },
      // ranks so weapon rolls produce a real pool rather than an empty one
      skills: {
        'Ranged: Light': { rank: 2 },
        'Gunnery': { rank: 1 },
        'Piloting: Space': { rank: 1 },
      },
      stats: {
        credits: { value: 500 },
        wounds: { value: 0, min: 0, max: 12 },   // species base 9 + Brawn 3
        strain: { value: 0, min: 0, max: 13 },   // species base 10 + Willpower 3
        // Soak is a stored base too, not a live derivation - _preUpdate only adjusts it when a
        // characteristic is edited, and _calculateDerivedValues computes encumbrance, not soak.
        // So an unarmoured character sits at Brawn, and armour adds on top through effects.
        soak: { value: 3, adjusted: 3 }
      },
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
      // minions use a shared wound pool and have no strain track
      stats: { wounds: { value: 0, min: 0, max: 5 } },
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
