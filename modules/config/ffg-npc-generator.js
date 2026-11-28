/**
 * Built-in NPC generator settings: tier tables, archetypes (the job), and modifiers (applied over any job)
 *
 * Each tier table holds the published adversaries of the sw-adversaries data set (creatures left out)
 * at the 10th, 20th … 90th percentile. Tier 1 sits at the 10th, tier 3 (typical) at the median, and
 * tier 5 at the 90th. Each roll may land a step either side. Characteristics and ranks are listed
 * highest first. Talents count ranks, without Adversary. Item tags are the ones the OggDude importer
 * writes, and names of talents that a world doesn't have are skipped
 */

export const tiers = {
  minion: {
    characteristics: [
      [2, 2, 1, 1, 1, 1],
      [2, 2, 2, 1, 1, 1],
      [2, 2, 2, 2, 1, 1],
      [3, 2, 2, 2, 2, 1],
      [3, 2, 2, 2, 2, 1],
      [3, 2, 2, 2, 2, 1],
      [3, 3, 2, 2, 2, 2],
      [3, 3, 2, 2, 2, 2],
      [3, 3, 3, 2, 2, 2],
    ],
    skills: [2, 2, 3, 3, 4, 4, 4, 5, 5],
    wounds: [3, 4, 5, 5, 5, 5, 5, 5, 6],
  },
  rival: {
    characteristics: [
      [3, 2, 1, 1, 1, 1],
      [3, 2, 2, 2, 1, 1],
      [3, 3, 2, 2, 2, 1],
      [3, 3, 2, 2, 2, 1],
      [3, 3, 2, 2, 2, 2],
      [3, 3, 3, 2, 2, 2],
      [4, 3, 3, 2, 2, 2],
      [4, 3, 3, 2, 2, 2],
      [4, 3, 3, 3, 2, 2],
    ],
    skills: [3, 4, 4, 5, 5, 6, 7, 7, 8],
    ranks: [
      [2, 1, 1, 1, 1, 1, 1, 1],
      [2, 2, 1, 1, 1, 1, 1, 1],
      [2, 2, 2, 2, 1, 1, 1, 1],
      [3, 2, 2, 2, 2, 1, 1, 1],
      [3, 2, 2, 2, 2, 2, 2, 2],
      [3, 3, 2, 2, 2, 2, 2, 2],
      [3, 3, 2, 2, 2, 2, 2, 2],
      [3, 3, 3, 2, 2, 2, 2, 2],
      [4, 3, 3, 3, 2, 2, 2, 2],
    ],
    wounds: [10, 10, 12, 12, 12, 13, 14, 15, 16],
    talents: [0, 0, 0, 0, 0, 1, 1, 2, 3],
    adversary: [0, 0, 0, 0, 0, 0, 0, 1, 1],
    talentRow: [1, 2],
  },
  nemesis: {
    characteristics: [
      [3, 3, 3, 2, 2, 1],
      [4, 3, 3, 2, 2, 2],
      [4, 3, 3, 3, 2, 2],
      [4, 3, 3, 3, 2, 2],
      [4, 4, 3, 3, 2, 2],
      [4, 4, 3, 3, 3, 2],
      [4, 4, 3, 3, 3, 2],
      [5, 4, 4, 3, 3, 2],
      [5, 4, 4, 4, 3, 3],
    ],
    skills: [7, 8, 8, 9, 10, 11, 11, 12, 14],
    ranks: [
      [3, 3, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1],
      [3, 3, 3, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1],
      [3, 3, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
      [4, 3, 3, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2],
      [4, 3, 3, 3, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2],
      [4, 4, 3, 3, 3, 3, 3, 2, 2, 2, 2, 2, 2, 2],
      [4, 4, 4, 3, 3, 3, 3, 3, 2, 2, 2, 2, 2, 2],
      [4, 4, 4, 4, 3, 3, 3, 3, 3, 2, 2, 2, 2, 2],
      [5, 4, 4, 4, 4, 3, 3, 3, 3, 3, 3, 3, 3, 2],
    ],
    wounds: [12, 13, 14, 15, 16, 16, 17, 18, 20],
    strain: [12, 13, 14, 15, 15, 16, 17, 18, 20],
    talents: [1, 2, 2, 3, 4, 5, 6, 8, 13],
    adversary: [0, 1, 1, 1, 2, 2, 2, 2, 3],
    talentRow: [2, 4],
  },
  // the rarest gear anyone at the tier carries (before modifiers)
  rarity: [4, 9],
  // the lowest tier that may carry restricted gear
  restricted: 3,
};


/** The settings every NPC starts from. The archetype and modifiers are laid over them */
export const defaults = {
  species: { odds: { "name:human": 60 } },
  gear: {},
};

const LIGHT_ARMOUR = { types: ["armour"], odds: { "light": 3, "heavy": 0.2 } };
// armour that actually protects, for the archetypes that expect a fight
const COMBAT_ARMOUR = { types: ["armour"], odds: { "hard": 3, "full body": 3 } };
// explosives share the Ranged: Light skill with pistols, so carried weapons rule them out
const NOT_EXPLOSIVE = ["grenade", "explosives/other", "mine"];

/** A carried weapon for a skill. `$combat` stands for the NPC's best combat skill */
const weapon = (skill, odds = {}, extra = {}) => ({
  types: ["weapon"], require: [`skill:${skill}`], exclude: NOT_EXPLOSIVE, odds: odds, ...extra,
});
const SIDEARM = weapon("ranged: light", { "pistol": 3, "blaster pistol": 3, "holdout blaster": 3 });

export const archetypes = {
  soldier: {
    label: "SWFFG.NpcGenerator.Archetype.Soldier",
    characteristics: { Brawn: 2, Agility: 3, Willpower: 1 },
    skills: {
      "Ranged: Heavy": 5, "Athletics": 2, "Resilience": 2, "Vigilance": 2, "Ranged: Light": 1, "Brawl": 1,
      "Knowledge: Warfare": 1,
    },
    talents: ["Toughened", "Point Blank", "Second Wind", "Durable", "Brace"],
    gear: {
      primary: weapon("$combat", { "rifle": 3, "blaster rifle": 3, "carbine": 3, "blaster carbine": 3 }),
      sidearm: { ...SIDEARM, chance: 0.4 },
      explosive: { types: ["weapon"], require: ["grenade"], chance: 0.3 },
      armour: COMBAT_ARMOUR,
      kit: { types: ["gear"], odds: { "communications": 3, "survival": 3, "reloads/ammo": 3 }, count: [0, 2] },
    },
    tags: ["soldier"],
  },
  sniper: {
    label: "SWFFG.NpcGenerator.Archetype.Sniper",
    characteristics: { Agility: 3, Cunning: 2, Willpower: 1 },
    skills: { "Ranged: Heavy": 5, "Perception": 3, "Stealth": 3, "Vigilance": 2, "Survival": 1, "Cool": 1 },
    talents: ["Sniper Shot", "True Aim", "Deadly Accuracy", "Brace", "Stalker", "Precise Aim"],
    gear: {
      primary: weapon("$combat", { "rifle": 3, "range:extreme": 3 }, {
        anyOf: ["range:long", "range:extreme"],
      }),
      sidearm: { ...SIDEARM, chance: 0.6 },
      armour: LIGHT_ARMOUR,
      kit: { types: ["gear"], odds: { "detection/surveillance devices": 3, "survival": 3 }, count: [1, 2] },
    },
    tags: ["sniper"],
  },
  brute: {
    label: "SWFFG.NpcGenerator.Archetype.Brute",
    characteristics: { Brawn: 4, Willpower: 1 },
    skills: { "Melee": 4, "Brawl": 3, "Coercion": 2, "Resilience": 2, "Athletics": 2 },
    talents: ["Toughened", "Durable", "Feral Strength", "Knockdown", "Grit", "Enduring"],
    gear: {
      primary: weapon("$combat", { "bludgeoning melee": 3, "powered melee": 3, "cutting edge melee": 3 }),
      armour: { ...COMBAT_ARMOUR, odds: { "heavy": 3, "hard": 3 } },
      kit: { types: ["gear"], odds: { "drugs and consumables": 3 }, count: [0, 1] },
    },
    tags: ["thug"],
  },
  medic: {
    label: "SWFFG.NpcGenerator.Archetype.Medic",
    characteristics: { Intellect: 3, Willpower: 1, Cunning: 1 },
    skills: {
      "Medicine": 5, "Knowledge: Education": 2, "Cool": 2, "Ranged: Light": 2, "Vigilance": 1, "Perception": 1,
    },
    talents: ["Surgeon", "Stim Application", "Bacta Specialist", "Natural Doctor", "Grit"],
    gear: {
      primary: weapon("$combat", { "pistol": 3, "blaster pistol": 3 }),
      armour: { ...LIGHT_ARMOUR, chance: 0.6 },
      kit: {
        types: ["gear"], anyOf: ["medical", "drugs and consumables", "antidotes"],
        odds: { medical: 3 }, count: [2, 3],
      },
    },
    tags: ["medic"],
  },
  slicer: {
    label: "SWFFG.NpcGenerator.Archetype.Slicer",
    characteristics: { Intellect: 4, Cunning: 1 },
    skills: {
      "Computers": 5, "Skulduggery": 2, "Mechanics": 2, "Ranged: Light": 2, "Streetwise": 1, "Deception": 1,
    },
    talents: ["Codebreaker", "Bypass Security", "Defensive Slicing", "Technical Aptitude", "Grit"],
    gear: {
      primary: weapon("$combat", { "holdout blaster": 3, "blaster pistol": 3 }),
      armour: { ...LIGHT_ARMOUR, chance: 0.4 },
      kit: {
        types: ["gear"], anyOf: ["slicing tools", "security/espionage", "tools/electronics"],
        odds: { "slicing tools": 3 }, count: [1, 3],
      },
    },
    tags: ["slicer"],
  },
  pilot: {
    label: "SWFFG.NpcGenerator.Archetype.Pilot",
    characteristics: { Agility: 3, Intellect: 1, Cunning: 1 },
    skills: {
      "Piloting: Space": 5, "Piloting: Planetary": 4, "Gunnery": 3, "Astrogation": 2, "Ranged: Light": 2,
      "Mechanics": 1, "Cool": 1,
    },
    talents: ["Full Throttle", "Skilled Jockey", "Galaxy Mapper", "Grit"],
    gear: {
      // gunnery is the pilot's best combat skill, but not what they carry
      primary: weapon("ranged: light", { "blaster pistol": 3 }),
      armour: { ...LIGHT_ARMOUR, chance: 0.5 },
      kit: { types: ["gear"], odds: { "communications": 3, "tools/electronics": 3 }, count: [0, 2] },
    },
    tags: ["pilot"],
  },
  officer: {
    label: "SWFFG.NpcGenerator.Archetype.Officer",
    characteristics: { Presence: 3, Willpower: 2, Intellect: 1 },
    skills: {
      "Leadership": 5, "Knowledge: Warfare": 3, "Discipline": 3, "Cool": 2, "Coercion": 2, "Ranged: Light": 2,
      "Vigilance": 1,
    },
    talents: ["Commanding Presence", "Field Commander", "Confidence", "Inspiring Rhetoric"],
    gear: {
      primary: weapon("ranged: light", { "blaster pistol": 3 }),
      armour: { ...LIGHT_ARMOUR, chance: 0.5 },
      kit: { types: ["gear"], odds: { "communications": 3, "uniforms and accessories": 3 }, count: [1, 2] },
    },
    tags: ["officer"],
  },
  scout: {
    label: "SWFFG.NpcGenerator.Archetype.Scout",
    characteristics: { Agility: 2, Cunning: 2, Willpower: 1, Brawn: 1 },
    skills: {
      "Survival": 5, "Perception": 3, "Stealth": 3, "Athletics": 2, "Ranged: Heavy": 2,
      "Knowledge: Outer Rim": 1, "Vigilance": 1,
    },
    talents: ["Expert Tracker", "Stalker", "Forager", "Outdoorsman", "Rapid Recovery"],
    gear: {
      primary: weapon("$combat", { "rifle": 3, "carbine": 3 }),
      armour: { types: ["armour"], odds: { "light": 3, "resistant": 3, "heavy": 0.2 } },
      kit: {
        types: ["gear"], count: [1, 3],
        odds: { "survival": 3, "detection/surveillance devices": 3, "communications": 3 },
      },
    },
    tags: ["scout"],
  },
  assassin: {
    label: "SWFFG.NpcGenerator.Archetype.Assassin",
    characteristics: { Agility: 3, Cunning: 3 },
    skills: {
      "Stealth": 5, "Ranged: Light": 3, "Melee": 3, "Skulduggery": 3, "Deception": 2, "Perception": 1,
      "Coordination": 1,
    },
    talents: ["Lethal Blows", "Precise Aim", "Targeted Blow", "Stalker", "Dodge", "Sniper Shot"],
    gear: {
      primary: weapon("ranged: light", { "holdout blaster": 3, "blaster pistol": 3 }),
      blade: weapon("melee", { "cutting edge melee": 3 }, { chance: 0.6 }),
      armour: { ...LIGHT_ARMOUR, chance: 0.7 },
      kit: { types: ["gear"], odds: { "poisons": 3, "security/espionage": 3 }, count: [1, 2] },
    },
    tags: ["assassin"],
  },
  face: {
    label: "SWFFG.NpcGenerator.Archetype.Face",
    characteristics: { Presence: 3, Cunning: 2 },
    skills: { "Charm": 5, "Deception": 4, "Negotiation": 3, "Cool": 2, "Streetwise": 2, "Ranged: Light": 1 },
    talents: ["Kill with Kindness", "Smooth Talker", "Convincing Demeanor", "Inspiring Rhetoric"],
    gear: {
      primary: weapon("ranged: light", { "holdout blaster": 3 }),
      armour: { ...LIGHT_ARMOUR, chance: 0.3 },
      kit: { types: ["gear"], odds: { "luxury items": 3, "communications": 3, "entertainment": 3 }, count: [1, 2] },
    },
    tags: ["civilian"],
  },
  mechanic: {
    label: "SWFFG.NpcGenerator.Archetype.Mechanic",
    characteristics: { Intellect: 3, Brawn: 1 },
    skills: {
      "Mechanics": 5, "Computers": 2, "Ranged: Light": 2, "Piloting: Planetary": 1, "Perception": 1, "Brawl": 1,
    },
    talents: ["Gearhead", "Fine Tuning", "Redundant Systems", "Tinkerer", "Toughened"],
    gear: {
      primary: weapon("$combat", { "blaster pistol": 3, "pistol": 3 }),
      armour: { ...LIGHT_ARMOUR, chance: 0.5 },
      kit: {
        types: ["gear"], anyOf: ["tools/electronics", "construction/salvage tools", "remotes"], count: [1, 3],
      },
    },
    tags: ["engineer"],
  },
  bountyHunter: {
    label: "SWFFG.NpcGenerator.Archetype.BountyHunter",
    characteristics: { Agility: 3, Brawn: 2, Cunning: 1 },
    skills: {
      "Ranged: Heavy": 4, "Ranged: Light": 3, "Perception": 3, "Vigilance": 2, "Streetwise": 2, "Brawl": 1,
      "Survival": 1, "Piloting: Planetary": 1,
    },
    talents: ["Quick Draw", "Point Blank", "Expert Tracker", "Toughened", "Lethal Blows", "Brace"],
    gear: {
      primary: weapon("$combat", { "rifle": 3, "carbine": 3 }),
      sidearm: { ...SIDEARM, chance: 0.7 },
      explosive: { types: ["weapon"], require: ["grenade"], chance: 0.3 },
      armour: COMBAT_ARMOUR,
      kit: {
        types: ["gear"], odds: { "security/espionage": 3, "detection/surveillance devices": 3 }, count: [1, 3],
      },
    },
    tags: ["bounty hunter"],
  },
  forceAdept: {
    label: "SWFFG.NpcGenerator.Archetype.ForceAdept",
    force: true,
    characteristics: { Willpower: 3, Presence: 2, Agility: 1 },
    skills: {
      "Lightsaber": 4, "Discipline": 3, "Cool": 2, "Vigilance": 2, "Knowledge: Lore": 2, "Perception": 1,
      "Athletics": 1,
    },
    talents: ["Parry", "Reflect", "Sense Danger", "Force Rating"],
    gear: {
      // lightsabers sit above every tier's rarity cap
      primary: weapon("lightsaber", { "lightsaber": 5, "lightsaber hilt": 0.05 }, {
        rarity: [0, 10], restricted: true,
      }),
      armour: { ...LIGHT_ARMOUR, chance: 0.5 },
      kit: { types: ["gear"], odds: { "holocrons/ancient lore": 3, "ancient talismans": 3 }, count: [0, 1] },
    },
    tags: ["force sensitive"],
  },
};

export const modifiers = {
  lowTech: {
    label: "SWFFG.NpcGenerator.Modifier.LowTech",
    rarity: -2,
    skills: { Survival: 1 },
    odds: {
      "slugthrower": 4, "bow": 3, "cutting edge melee": 2, "bludgeoning melee": 2, "thrown": 2,
      "half body": 2, "survival": 2,
      "energy weapon": 0.15, "blaster": 0.15, "lightsaber": 0.05, "cybernetics": 0.1, "remotes": 0.2,
      "powered": 0.2, "powered melee": 0.3, "powered brawl": 0.3, "portable gunnery": 0.1,
    },
    tags: ["low-tech"],
  },
  highTech: {
    label: "SWFFG.NpcGenerator.Modifier.HighTech",
    rarity: 2,
    odds: {
      "cybernetics": 2, "remotes": 2, "detection/surveillance devices": 2, "sealed": 2, "powered": 2,
      "energy weapon": 1.5, "slugthrower": 0.3, "bow": 0.2,
    },
    gear: { implant: { types: ["gear"], require: ["cybernetics"], chance: 0.4 } },
    tags: ["high-tech"],
  },
  imperial: {
    label: "SWFFG.NpcGenerator.Modifier.Imperial",
    restricted: true,
    skills: { "Discipline": 1, "Knowledge: Warfare": 1 },
    odds: {
      "hard full body": 3, "blaster rifle": 2, "blaster carbine": 2, "uniforms and accessories": 2,
      "slugthrower": 0.4, "black market": 0.1, "slaver tech": 0.1,
    },
    tags: ["empire", "imperial military"],
  },
  rebel: {
    label: "SWFFG.NpcGenerator.Modifier.Rebel",
    restricted: true,
    skills: { Cool: 1 },
    odds: {
      "blaster carbine": 2, "blaster rifle": 1.5, "half body": 2, "light": 1.5,
      "black market": 0.4, "slaver tech": 0.1,
    },
    tags: ["rebel alliance"],
  },
  underworld: {
    label: "SWFFG.NpcGenerator.Modifier.Underworld",
    restricted: true,
    skills: { "Streetwise": 2, "Knowledge: Underworld": 1, "Coercion": 1 },
    odds: {
      "black market": 3, "poisons": 2, "holdout blaster": 2, "blaster pistol": 1.5,
      "slaver tech": 1.5, "drugs and consumables": 1.5,
    },
    tags: ["underworld"],
  },
  droid: {
    label: "SWFFG.NpcGenerator.Modifier.Droid",
    species: { require: ["name:droid"] },
    characteristics: { Presence: -1 },
    odds: { "drugs and consumables": 0.05, "poisons": 0.05, "medical": 0.3 },
    tags: ["species:droid"],
  },
  forceSensitive: {
    label: "SWFFG.NpcGenerator.Modifier.ForceSensitive",
    force: true,
    characteristics: { Willpower: 1 },
    skills: { Discipline: 1, Vigilance: 1, Lightsaber: 1 },
    talents: ["Uncanny Senses", "Sense Danger", "Force Rating", "Parry"],
    odds: { "lightsaber": 2, "ancient talismans": 2, "holocrons/ancient lore": 2 },
    tags: ["force sensitive"],
  },
  veteran: {
    label: "SWFFG.NpcGenerator.Modifier.Veteran",
    tier: 1,
    talents: ["Grit", "Toughened", "Durable"],
    tags: ["veteran"],
  },
  green: {
    label: "SWFFG.NpcGenerator.Modifier.Green",
    tier: -1,
    tags: ["green"],
  },
};

/** Fixed values the generator is built around, kept here so they live in one place */
export const constants = {
  // tiers run from 1 (weakest) to this, and each tier table's 9 percentiles are spread over them
  tierCount: 5,
  // the highest rank a skill can have, which also caps a minion group's skill
  maxRank: 5,
  // a characteristic's value before the species changes it
  baseCharacteristic: 2,
  // the item types an NPC can carry, as limits in the window and as gear slots
  itemTypes: ["weapon", "armour", "gear"],
  // the combat skill an NPC falls back on when nothing trains or names one
  fallbackCombatSkill: "Ranged: Light",
  // what a new NPC starts as, unless told otherwise
  start: { archetype: "soldier", type: "rival", tier: 3, minionSize: 3 },
  // the fields read from each compendium's index, so whole documents are never loaded
  indexFields: [
    "system.metadata.tags", "system.skill.value", "system.range.value", "system.soak.value", "system.defence.value",
    "system.rarity.value", "system.rarity.isrestricted", "system.attributes", "system.silhouette",
    "system.ranks.ranked", "system.isForceTalent", "system.tier",
  ],
};

export const npcGenerator = { tiers, defaults, archetypes, modifiers, constants };
