import { norm, resolvePreset } from "./npc-generator-presets.js";
import { constants } from "../config/ffg-npc-generator.js";

/**
 * Builds NPCs. The NPC is first built as a "draft": a plain object holding its species, characteristics, skills,
 * talents, gear, and stats. The GM can lock sections so a reroll skips them
 * createActor() then turns the finished draft into an actual Actor
 */

/* -------------------------------------------- */
/*  Randomness                                  */
/* -------------------------------------------- */

/** Foundry's seeded random numbers, plus two helpers. The same seed gives the same numbers, and so the same NPC */
export function makeRng(seed) {
  const twister = new foundry.dice.MersenneTwister(seed);
  const next = () => twister.random();

  return {
    next,
    /** An integer from min to max, both included */
    int(min, max) {
      return min + Math.floor(next() * (max - min + 1));
    },
    /** One entry, chosen in proportion to its weight, or null when nothing has any weight */
    weighted(entries, weightOf) {
      const weights = entries.map((entry) => Math.max(0, weightOf(entry)));
      const total = weights.reduce((sum, w) => sum + w, 0);
      if (total <= 0) return null;
      let roll = next() * total;
      for (let i = 0; i < entries.length; i++) {
        roll -= weights[i];
        if (roll < 0) return entries[i];
      }
      return entries[entries.length - 1];
    },
  };
}

/** A random seed for a new NPC */
export function newSeed() {
  return Math.floor(Math.random() * 2 ** 32);
}

/* -------------------------------------------- */
/*  Queries                                     */
/* -------------------------------------------- */

/**
 * Item searches ("queries"), used to pick species and gear from the entries toEntry() makes. A query may hold:
 *   types          only these item types, e.g., ["weapon"]
 *   require        tags the item must all have
 *   anyOf          tags the item must have at least one of
 *   exclude        tags the item must not have
 *   odds           { tag: multiplier }: an item with the tag is that many times as likely to be picked,
 *                  e.g., { blaster: 3, slugthrower: 0.2 }. Unlike the rest, it never rules an item out
 *   rarity         [min, max]
 *   restricted     false rules out restricted items
 */

/** Whether an entry passes a query's limits (everything but its odds) */
export function matches(entry, query = {}) {
  const has = (tag) => entry.keys.has(norm(tag));
  if (query.types?.length && !query.types.includes(entry.type)) return false;
  if (!(query.require ?? []).every(has)) return false;
  if (query.anyOf?.length && !query.anyOf.some(has)) return false;
  if ((query.exclude ?? []).some(has)) return false;
  if (query.restricted === false && entry.restricted) return false;
  const [min, max] = query.rarity ?? [-Infinity, Infinity];
  return entry.rarity.between(min, max);
}

/** An entry's odds of being picked: 1, times the multiplier of each tag in the query's odds that it has */
export function weight(entry, query = {}) {
  let result = 1;
  for (const [tag, multiplier] of Object.entries(query.odds ?? {})) {
    if (entry.keys.has(norm(tag))) result *= multiplier;
  }
  return result;
}

/**
 * The entries that pass a query. If none do, it tries again without the rarity and restricted limits, so a slot
 * only stays empty when no item has its tags. `relaxed` says whether it had to
 */
export function candidates(entries, query = {}) {
  const found = entries.filter((entry) => matches(entry, query));
  if (found.length) return { found, relaxed: false };
  const loose = { ...query, rarity: undefined, restricted: undefined };
  return { found: entries.filter((entry) => matches(entry, loose)), relaxed: true };
}

/** Picks one entry at random by its odds, leaving out the uuids in `taken`. Null when nothing fits */
export function pick(entries, query, rng, taken = new Set()) {
  const open = entries.filter((entry) => !taken.has(entry.uuid));
  const { found, relaxed } = candidates(open, query);
  const chosen = rng.weighted(found, (entry) => weight(entry, query));
  return chosen ? { entry: chosen, relaxed } : null;
}

/* -------------------------------------------- */
/*  Item index                                  */
/* -------------------------------------------- */

const get = foundry.utils.getProperty;

/**
 * The Item compendiums listed in a system setting (comma-separated ids). An empty setting means every Item
 * compendium, since some worlds never fill in `talentCompendiums`
 */
export function packsFor(setting) {
  const ids = game.settings.get("starwarsffg", setting).split(",").map((id) => id.trim()).filter(Boolean);
  if (!ids.length) return game.packs.filter((pack) => pack.documentName === "Item");
  return ids.map((id) => game.packs.get(id)).filter(Boolean);
}

/**
 * An index row as a search entry: its stats as plain values, and `keys`, every term a query can match it by
 * (its tags, plus `type:`, `name:`, `skill:`, and `range:` terms)
 */
export function toEntry(raw, uuid) {
  const tags = (get(raw, "system.metadata.tags") ?? []).map(norm).filter(Boolean);
  const entry = {
    uuid: uuid,
    name: raw.name,
    type: raw.type,
    img: raw.img,
    raw: raw,
    skill: get(raw, "system.skill.value") ?? null,
    range: get(raw, "system.range.value") ?? null,
    soak: Number(get(raw, "system.soak.value") ?? 0),
    defence: Number(get(raw, "system.defence.value") ?? 0),
    rarity: Number(get(raw, "system.rarity.value") ?? 0),
    restricted: Boolean(get(raw, "system.rarity.isrestricted")),
  };
  // stats and the name can be matched like tags, e.g., `range:long` or `skill:ranged: heavy`
  entry.tags = tags;
  entry.keys = new Set([...tags, `type:${norm(raw.type)}`, `name:${norm(raw.name)}`]);
  if (entry.skill) entry.keys.add(`skill:${norm(entry.skill)}`);
  if (entry.range) entry.keys.add(`range:${norm(entry.range)}`);
  return entry;
}

/** The search entries for every item of the given types in the compendiums a setting lists */
export async function loadIndex(setting, types) {
  const entries = [];
  for (const pack of packsFor(setting)) {
    const index = await pack.getIndex({ fields: constants.indexFields });
    for (const raw of index) {
      if (types && !types.includes(raw.type)) continue;
      entries.push(toEntry(raw, raw.uuid ?? pack.getUuid(raw._id)));
    }
  }
  return entries;
}

/* -------------------------------------------- */
/*  Generation                                  */
/* -------------------------------------------- */

/** The characteristic keys, e.g., "Brawn" */
export const characteristics = () => Object.keys(CONFIG.FFG.characteristics);

/** A value for a tier, spread evenly from `low` at tier 1 to `high` at the top tier */
export const lerp = ([low, high], tier) => Math.round(Math.mix(low, high, (tier - 1) / (constants.tierCount - 1)));

/**
 * A tier's value from a tier table, which lists the published adversaries' values at the 10th, 20th … 90th
 * percentile. Tier 1 reads the 10th, tier 3 the median, and tier 5 the 90th. With `rng`, it may move one step
 */
export function atTier(table, tier, rng) {
  const step = (table.length - 1) / (constants.tierCount - 1);
  const index = Math.round((tier - 1) * step) + (rng ? rng.int(-1, 1) : 0);
  return table[Math.clamp(index, 0, table.length - 1)];
}

/** The species, talents, and items to choose from. The window reads them once, so rerolls are quick */
export async function loadContent() {
  const [items, species, talents] = await Promise.all([
    loadIndex("itemCompendiums", constants.itemTypes),
    loadIndex("speciesCompendiums", ["species"]),
    loadIndex("talentCompendiums", ["talent"]),
  ]);
  return {
    items: items,
    species: species,
    talents: new Map(talents.map((talent) => [norm(talent.name), talent])),
  };
}

/** What every step reads: the combined recipe, the tier after modifiers, and the type's tier table */
function context(draft, content) {
  const config = CONFIG.FFG.npcGenerator;
  const recipe = resolvePreset(draft.options.archetype ?? {}, draft.options.modifiers ?? []);
  return {
    content: content,
    options: draft.options,
    recipe: recipe,
    tier: Math.clamp((draft.options.tier ?? constants.start.tier) + recipe.tier, 1, constants.tierCount),
    table: config.tiers[draft.type],
    tiers: config.tiers,
  };
}

/** Random numbers for one step. Each step has its own, so rerolling one step leaves the others alone */
function rngFor(draft, step) {
  const offset = Object.keys(STEPS).indexOf(step) * 7919 + (draft.rolls[step] ?? 0) * 104729;
  return makeRng(draft.seed + offset);
}

/** Every characteristic at its value before any species changes it */
const baseCharacteristics = () => Object.fromEntries(characteristics().map((c) => [c, constants.baseCharacteristic]));

/** A species' starting characteristics: the base value each, unless the species changes them */
function speciesBase(entry) {
  const base = baseCharacteristics();
  for (const attribute of Object.values(entry.raw.system?.attributes ?? {})) {
    if (attribute.modtype === "Characteristic" && attribute.mod in base) {
      base[attribute.mod] = Number(attribute.value);
    }
  }
  return base;
}

async function stepSpecies(draft, ctx, rng) {
  if (ctx.options.species === false) {
    draft.species = null;
    return;
  }
  const allowed = ctx.content.species.filter((entry) => tagsPass(entry, ctx.options.filters?.species));
  const entry = ctx.options.species
    ? ctx.content.species.find((s) => s.uuid === ctx.options.species)
    : pick(allowed, ctx.recipe.species, rng)?.entry;
  draft.species = entry ? {
    uuid: entry.uuid,
    name: entry.name,
    img: entry.img,
    base: speciesBase(entry),
    silhouette: Number(entry.raw.system?.silhouette ?? 1),
  } : null;
}

async function stepCharacteristics(draft, ctx, rng) {
  const { recipe, table, tier } = ctx;
  // the tier's characteristics, highest first, go to what the archetype and species are best at
  const profile = atTier(table.characteristics, tier, rng);
  const base = draft.species?.base ?? baseCharacteristics();
  const lean = (c) => (recipe.characteristics[c] ?? 0) + (base[c] - constants.baseCharacteristic) * 2;
  const want = (c) => Math.max(0.1, 1 + lean(c));
  const left = characteristics();
  const values = {};
  for (const value of profile) {
    // squared, as for skills, so an archetype's characteristics lead nearly every time
    const characteristic = rng.weighted(left, (c) => want(c) ** 2) ?? left[0];
    values[characteristic] = value;
    left.splice(left.indexOf(characteristic), 1);
  }
  draft.characteristics = values;
}

/** The skill list of the world's skill theme. Unlike CONFIG.FFG.skills, it holds each skill's type */
function themeSkills() {
  const theme = game.settings.get("starwarsffg", "skilltheme");
  return CONFIG.FFG.alternateskilllists?.find((list) => list.id === theme)?.skills ?? CONFIG.FFG.skills;
}

/**
 * determine the dice an NPC's skill rolls
 */
export function skillDice(draft, key) {
  const skill = draft.skills[key] ?? { rank: 0, groupskill: false };
  const characteristic = themeSkills()[key]?.characteristic;
  const value = draft.characteristics[characteristic] ?? 0;
  const rank = skill.groupskill ? Math.clamp(draft.size - 1, 0, constants.maxRank) : skill.rank;
  const proficiency = Math.min(value, rank);
  return { characteristic, value, rank, proficiency, ability: Math.max(value, rank) - proficiency };
}

async function stepSkills(draft, ctx, rng) {
  const { recipe, table, tier } = ctx;
  const known = Object.keys(themeSkills());
  const want = (skill) => {
    const listed = recipe.skills[skill] ?? 0;
    if (listed > 0) return listed;
    // a lightsaber in untrained hands is out of place
    return skill === "Lightsaber" && !recipe.force ? 0 : 0.1;
  };

  const count = atTier(table.skills, tier, rng);
  const open = [...known];
  const chosen = [];
  while (chosen.length < count && open.length) {
    // the archetype's own skill always comes first, and squaring the rest keeps them on theme
    let skill;
    if (chosen.length) {
      skill = rng.weighted(open, (s) => want(s) ** 2);
    } else {
      const best = Math.max(...open.map(want));
      skill = rng.weighted(open.filter((s) => want(s) === best), () => 1);
    }
    if (!skill) break;
    chosen.push(skill);
    open.splice(open.indexOf(skill), 1);
  }
  chosen.sort((a, b) => want(b) - want(a));

  // the tier's ranks, highest first, in the order the archetype wants the skills (minions use groups)
  const ranks = table.ranks ? atTier(table.ranks, tier, rng) : [];
  const skills = {};
  for (const [i, skill] of chosen.entries()) {
    const rank = table.ranks ? (ranks[i] ?? 1) : 0;
    skills[skill] = { rank: rank, groupskill: draft.type === "minion", careerskill: false };
  }
  draft.skills = skills;
}

/** The NPC's best combat skill. A gear search can write `$combat` for it, so a sniper gets a sniper's weapon */
export function combatSkill(draft, recipe) {
  const skills = themeSkills();
  const isCombat = (skill) => skills[skill]?.type === "Combat";
  const weightOf = (skill) => recipe.skills[skill] ?? 0;
  const trained = Object.keys(draft.skills ?? {}).filter(isCombat);
  trained.sort((a, b) => (draft.skills[b].rank - draft.skills[a].rank) || (weightOf(b) - weightOf(a)));
  if (trained.length) return trained[0];
  const listed = Object.keys(recipe.skills).filter(isCombat);
  listed.sort((a, b) => weightOf(b) - weightOf(a));
  return listed[0] ?? constants.fallbackCombatSkill;
}

async function stepTalents(draft, ctx, rng) {
  const { content, recipe, table, tier } = ctx;
  draft.talents = [];
  if (!table.talents) return;

  const rowCap = lerp(table.talentRow, tier);
  const pool = new Map();
  const offer = (name) => {
    const key = norm(name);
    const talent = content.talents.get(key);
    if (!talent || key === "adversary") return;
    if (talent.raw.system?.isForceTalent && !recipe.force) return;
    // the tier's talent row caps how advanced a talent can be
    if (Number(talent.raw.system?.tier ?? 1) > rowCap) return;
    pool.set(key, { talent: talent, weight: 1 });
  };

  for (const name of recipe.talents) offer(name);

  const ranks = new Map();
  const count = atTier(table.talents, tier, rng);
  for (let i = 0; i < count && pool.size; i++) {
    const [key, option] = rng.weighted([...pool.entries()], ([, o]) => o.weight);
    ranks.set(key, (ranks.get(key) ?? 0) + 1);
    if (option.talent.raw.system?.ranks?.ranked) option.weight /= 2;
    else pool.delete(key);
  }

  const adversary = content.talents.get("adversary");
  const adversaryRank = table.adversary ? atTier(table.adversary, tier, rng) : 0;
  if (adversary && adversaryRank) ranks.set("adversary", adversaryRank);

  for (const [key, rank] of ranks) {
    const talent = content.talents.get(key);
    draft.talents.push({ uuid: talent.uuid, name: talent.name, rank: rank });
  }
}

/** Whether an entry passes one of the GM's tag limits: it has an allowed tag (if any are set) and no excluded one */
function tagsPass(entry, { allow = [], exclude = [] } = {}) {
  if (allow.length && !allow.some((tag) => entry.keys.has(norm(tag)))) return false;
  return !exclude.some((tag) => entry.keys.has(norm(tag)));
}

/**
 * The items left after the limits the GM set in the window: tags for each kind of item, a rarity range, and
 * restricted items. Unlike a preset's limits, these are never relaxed
 */
export function filterItems(items, filters = {}) {
  const [min, max] = filters.rarity ?? [];
  return items.filter((entry) => {
    if (!tagsPass(entry, filters[entry.type])) return false;
    if (filters.restricted === false && entry.restricted) return false;
    if (Number.isFinite(min) && (entry.rarity ?? 0) < min) return false;
    return !(Number.isFinite(max) && (entry.rarity ?? 0) > max);
  });
}

async function stepGear(draft, ctx, rng) {
  const { content, recipe, tier, tiers, options } = ctx;
  // filterItems applies the GM's rarity range, and a maximum the GM sets also replaces the tier's cap
  const items = filterItems(content.items, options.filters);
  const gmMax = options.filters?.rarity?.[1];
  const rarityCap = Number.isFinite(gmMax) ? gmMax : lerp(tiers.rarity, tier) + recipe.rarity;
  const restricted = recipe.restricted ?? tier >= tiers.restricted;
  const combat = combatSkill(draft, recipe);
  const taken = new Set();
  draft.items = [];

  for (const [slot, slotQuery] of Object.entries(recipe.gear)) {
    if (slotQuery.chance !== undefined && rng.next() >= slotQuery.chance) continue;
    const count = slotQuery.count ?? 1;
    const [low, high] = Array.isArray(count) ? count : [count, count];
    const query = {
      ...slotQuery,
      // `$combat` stands for the NPC's best combat skill
      require: slotQuery.require?.map((tag) => tag.replace("$combat", norm(combat))),
      rarity: slotQuery.rarity ?? [0, rarityCap],
      restricted: slotQuery.restricted ?? restricted,
    };
    const wanted = rng.int(low, high);
    for (let i = 0; i < wanted; i++) {
      const found = pick(items, query, rng, taken);
      if (!found) break;
      const { entry, relaxed } = found;
      taken.add(entry.uuid);
      draft.items.push({
        slot: slot,
        uuid: entry.uuid,
        name: entry.name,
        type: entry.type,
        soak: entry.soak,
        defence: entry.defence,
        relaxed: relaxed,
      });
    }
  }
}

async function stepStats(draft, ctx, rng) {
  const { table, tier } = ctx;
  const armour = draft.items.find((item) => item.type === "armour");
  const stats = {
    soak: draft.characteristics.Brawn + (armour?.soak ?? 0),
    defence: armour?.defence ?? 0,
  };
  const wounds = atTier(table.wounds, tier, rng);
  if (draft.type === "minion") stats.unitWounds = wounds;
  else stats.wounds = wounds;
  if (table.strain) stats.strain = atTier(table.strain, tier, rng);
  draft.stats = stats;
}

async function stepIdentity(draft, ctx) {
  const label = game.i18n.localize(ctx.recipe.label ?? "SWFFG.NpcGenerator.DefaultName");
  draft.name = ctx.options.name ?? (draft.species ? `${label} (${draft.species.name})` : label);
  draft.tags = [...new Set([...ctx.recipe.tags, ...(ctx.options.tags ?? [])].map(norm))];
}

/** The steps that fill each section of a draft, in the order they run */
const STEPS = {
  species: stepSpecies,
  characteristics: stepCharacteristics,
  skills: stepSkills,
  talents: stepTalents,
  gear: stepGear,
  stats: stepStats,
  identity: stepIdentity,
};

/** The sections the GM can see, lock, and reroll (every step but naming) */
export const SECTIONS = Object.keys(STEPS).filter((step) => step !== "identity");

async function runFrom(draft, content, first) {
  const ctx = context(draft, content);
  const names = Object.keys(STEPS);
  for (const step of names.slice(names.indexOf(first))) {
    if (!draft.locks[step]) await STEPS[step](draft, ctx, rngFor(draft, step));
  }
  return draft;
}

/**
 * Builds a new NPC draft. Options:
 *   archetype, modifiers  preset keys, e.g., "sniper" and ["veteran"]
 *   type                  "minion", "rival", or "nemesis"
 *   tier                  1-5
 *   size                  a minion group's size
 *   species               a species uuid, or false for none (random when left out)
 *   name, tags
 *   seed                  the same seed rebuilds the same NPC
 *   filters               the GM's limits: { species, weapon, armour, gear: { allow, exclude } } as tags, plus
 *                         rarity: [min, max], and restricted: false
 */
export async function generate(options = {}) {
  const draft = { seed: newSeed(), rolls: {}, type: options.type ?? constants.start.type, locks: {} };
  return regenerate(draft, options);
}

/**
 * Builds a draft again with new options, keeping its seed and its locked sections. Changing the type unlocks
 * everything, since a minion's sections don't fit a nemesis
 */
export async function regenerate(draft, { content, ...options } = {}) {
  const type = options.type ?? constants.start.type;
  if (type !== draft.type) draft.locks = {};
  draft.type = type;
  draft.size = options.size ?? (type === "minion" ? constants.start.minionSize : 1);
  draft.options = options;
  if (options.seed !== undefined) draft.seed = options.seed;
  return runFrom(draft, content ?? await loadContent(), "species");
}

/** Rerolls one section, then every unlocked section after it, since they depend on it */
export async function reroll(draft, step, content) {
  draft.rolls[step] = (draft.rolls[step] ?? 0) + 1;
  return runFrom(draft, content ?? await loadContent(), step);
}

/** A copy of an item's data to add to the new Actor, with `changes` (by path) applied */
async function itemData(uuid, changes = {}) {
  const doc = await fromUuid(uuid);
  return doc ? foundry.utils.mergeObject(game.items.fromCompendium(doc), changes) : null;
}

/** The `system` values the new Actor's sheet must show, e.g., { stats: { soak: { value: 4 } } } */
function shown(draft) {
  const { soak, defence, wounds, strain } = draft.stats;
  const stats = { soak: { value: soak }, defence: { melee: defence, ranged: defence } };
  if (draft.type !== "minion") stats.wounds = { max: wounds };
  if (strain !== undefined) stats.strain = { max: strain };
  const values = Object.fromEntries(characteristics().map((c) => [c, { value: draft.characteristics[c] }]));
  return { characteristics: values, stats: stats };
}

/**
 * Creates the Actor from a draft. Its species and items add Active Effects on top of the stored values, so each
 * stored value is then adjusted until the sheet shows what the draft says
 */
export async function createActor(draft, { folder } = {}) {
  const items = [];
  if (draft.species) items.push(await itemData(draft.species.uuid));
  for (const item of draft.items) {
    const data = await itemData(item.uuid);
    // whatever can be equipped is
    if (data?.system.equippable) data.system.equippable.equipped = true;
    items.push(data);
  }
  for (const talent of draft.talents) {
    items.push(await itemData(talent.uuid, { "system.ranks.current": talent.rank }));
  }

  const system = { ...shown(draft), skills: draft.skills, metadata: { tags: draft.tags } };
  if (draft.species) system.stats.silhouette = { value: draft.species.silhouette };
  if (draft.type === "minion") {
    system.unit_wounds = { value: draft.stats.unitWounds };
    system.quantity = { value: draft.size, max: draft.size };
  } else if (draft.species) {
    system.species = { value: draft.species.name };
  }

  const actor = await Actor.implementation.create({
    name: draft.name,
    type: draft.type,
    folder: folder ?? null,
    system: system,
    flags: {
      starwarsffg: {
        config: { enableAutoSoakCalculation: false, enableCriticalInjuries: draft.type !== "minion" },
      },
    },
  });
  await actor.createEmbeddedDocuments("Item", items.filter(Boolean));

  // characteristics first: ActorFFG._preUpdate rewrites the stats whenever Brawn or Willpower changes
  const wanted = Object.entries(foundry.utils.flattenObject({ system: shown(draft) }));
  await correct(actor, wanted.filter(([path]) => path.startsWith("system.characteristics.")));
  await correct(actor, wanted.filter(([path]) => !path.startsWith("system.characteristics.")));
  return actor;
}

/** Adjusts each stored value by the gap between what the Actor shows and what it should */
async function correct(actor, wanted) {
  const correction = {};
  for (const [path, want] of wanted) {
    const now = foundry.utils.getProperty(actor, path);
    if (now !== want) correction[path] = foundry.utils.getProperty(actor._source, path) + want - now;
  }
  if (!foundry.utils.isEmpty(correction)) await actor.update(correction);
}
