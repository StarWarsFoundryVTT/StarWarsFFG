/**
 * NPC generator presets
 *   An archetype is the NPC's job (sniper, medic…)
 *   A modifier is a trait that can be laid over any job (low-tech, veteran…)
 * Both live in CONFIG.FFG.npcGenerator
 */

const PREFIX = "SWFFG.NpcGenerator.Preset";
const KINDS = { archetype: "archetypes", modifier: "modifiers" };

/** Trims and lowercases a tag or name, so "Blaster " and "blaster" match */
export const norm = (value) => String(value ?? "").trim().toLowerCase();

/* -------------------------------------------- */
/*  Merging                                     */
/* -------------------------------------------- */

const LISTS = ["types", "require", "anyOf", "exclude"];

/**
 * Lays one item search over another: lists are joined, odds for the same tag multiply, and for anything else
 * `over` wins
 */
function mergeQuery(base = {}, over = {}) {
  const merged = { ...base, ...over, odds: { ...base.odds } };
  for (const key of LISTS) {
    if (base[key] || over[key]) merged[key] = [...(base[key] ?? []), ...(over[key] ?? [])];
  }
  for (const [tag, multiplier] of Object.entries(over.odds ?? {})) {
    merged.odds[tag] = (merged.odds[tag] ?? 1) * multiplier;
  }
  return merged;
}

/** Adds weights together, e.g., { Brawn: 1 } and { Brawn: 2, Agility: 1 } give { Brawn: 3, Agility: 1 } */
function addWeights(base = {}, over = {}) {
  const merged = { ...base };
  for (const [key, value] of Object.entries(over)) merged[key] = (merged[key] ?? 0) + value;
  return merged;
}

const unique = (...lists) => [...new Set(lists.flat().filter(Boolean))];

/**
 * Lays preset `over` on top of preset `base`. Weights and the rarity and tier shifts add up, lists are joined,
 * and for anything else `over` wins. A preset's own `odds` apply to every gear slot
 */
export function mergePreset(base, over) {
  const gear = { ...base.gear };
  for (const [slot, query] of Object.entries(over.gear ?? {})) gear[slot] = mergeQuery(gear[slot], query);
  for (const slot of Object.keys(gear)) gear[slot] = mergeQuery(gear[slot], { odds: over.odds });

  return {
    ...base,
    label: base.label ?? over.label,
    force: over.force ?? base.force ?? false,
    restricted: over.restricted ?? base.restricted,
    rarity: (base.rarity ?? 0) + (over.rarity ?? 0),
    tier: (base.tier ?? 0) + (over.tier ?? 0),
    characteristics: addWeights(base.characteristics, over.characteristics),
    skills: addWeights(base.skills, over.skills),
    species: mergeQuery(base.species, over.species),
    talents: unique(base.talents, over.talents),
    gear: gear,
    tags: unique(base.tags, over.tags),
  };
}

/** Finds a preset by its config key, e.g., "sniper". A preset object passed in is returned as it is */
function lookup(preset, table, kind) {
  if (preset && typeof preset === "object") return preset;
  const found = table[preset];
  if (!found) throw new Error(`Unknown NPC generator ${kind}: ${preset}`);
  return found;
}

/** The recipe for an NPC: the defaults, then the archetype, then each modifier in the order given */
export function resolvePreset(archetype, modifiers = [], config = CONFIG.FFG.npcGenerator) {
  let recipe = mergePreset(config.defaults, lookup(archetype, config.archetypes, "archetype"));
  for (const modifier of modifiers) recipe = mergePreset(recipe, lookup(modifier, config.modifiers, "modifier"));
  return recipe;
}

/** The archetypes and modifiers to offer, as { archetype: [{ id, label }], modifier: [{ id, label }] } */
export function listPresets(config = CONFIG.FFG.npcGenerator) {
  const list = {};
  for (const [kind, table] of Object.entries(KINDS)) {
    list[kind] = Object.entries(config[table]).map(([key, preset]) => ({
      id: key, label: game.i18n.localize(preset.label),
    }));
  }
  return list;
}

/* -------------------------------------------- */
/*  Describing                                  */
/* -------------------------------------------- */

/** An item search in words, for a tooltip, e.g., "gear; needs cybernetics; 40% of the time" */
function describeQuery(query = {}) {
  const t = (key, list) => game.i18n.format(`${PREFIX}.Query.${key}`, { list: list });
  const parts = [];
  if (query.types?.length) parts.push(query.types.join("/"));
  if (query.require?.length) parts.push(t("Require", query.require.join(", ")));
  if (query.anyOf?.length) parts.push(t("Require", query.anyOf.join(" | ")));
  if (query.exclude?.length) parts.push(t("Exclude", query.exclude.join(", ")));
  if (query.chance !== undefined) parts.push(t("Chance", Math.round(query.chance * 100)));
  return parts.join("; ");
}

/** A modifier's tooltip: an HTML list with one line for each thing the modifier changes */
export function explainModifier(recipe = {}) {
  const t = (key, data = {}) => game.i18n.format(`${PREFIX}.Tip.${key}`, data);
  const esc = foundry.utils.escapeHTML;
  const shifts = (weights = {}) => {
    const listed = Object.entries(weights).filter(([, weight]) => weight);
    return listed.map(([name, weight]) => `${name} ${weight.signedString()}`);
  };
  // e.g., "slugthrower ×4", for the tags above 1 or below it
  const odds = (up) => {
    const listed = Object.entries(recipe.odds ?? {}).filter(([, multiplier]) => (up ? multiplier > 1 : multiplier < 1));
    return listed.map(([tag, multiplier]) => `${tag} ×${multiplier}`).join(", ");
  };
  const lines = [];
  if (recipe.tier) lines.push(t("Tier", { shift: recipe.tier.signedString() }));
  if (recipe.rarity) lines.push(t("Rarity", { shift: recipe.rarity.signedString() }));
  if (recipe.restricted !== undefined) lines.push(t(recipe.restricted ? "Restricted" : "NoRestricted"));
  if (recipe.force) lines.push(t("Force"));
  if (recipe.species) lines.push(t("Species", { query: describeQuery(recipe.species) }));
  const characteristics = shifts(recipe.characteristics);
  if (characteristics.length) lines.push(t("Characteristics", { list: characteristics.join(", ") }));
  const skills = shifts(recipe.skills);
  if (skills.length) lines.push(t("Skills", { list: skills.join(", ") }));
  if (recipe.talents?.length) lines.push(t("Talents", { list: recipe.talents.join(", ") }));
  if (odds(true)) lines.push(t("Prefer", { list: odds(true) }));
  if (odds(false)) lines.push(t("Avoid", { list: odds(false) }));
  for (const [slot, query] of Object.entries(recipe.gear ?? {})) {
    lines.push(t("Slot", { slot, query: describeQuery(query) }));
  }
  if (!lines.length) lines.push(t("Nothing"));
  return `<ul class="npc-generator-tip">${lines.map((line) => `<li>${esc(line)}</li>`).join("")}</ul>`;
}
