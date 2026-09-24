import { defaultedMap, keyedMap, metadata, numberStat } from "../fields.js";
import { defaultSkillList } from "../../config/ffg-skillslist.js";

const fields = foundry.data.fields;

/**
 * The shared blocks template.json spelled out under `Actor.templates`, as schema partials. Each
 * returns plain fields to be spread into a subtype's schema.
 */

/** Tags and source books. */
export function metaOnly() {
  return { metadata: metadata() };
}

export function biography() {
  return { biography: new fields.HTMLField({ required: true, blank: true, initial: "" }) };
}

/** A name paired with the dtype the sheets read - species, career, and specialization share it. */
function named(extra = {}) {
  return new fields.SchemaField({
    value: new fields.StringField({ required: true, blank: true, initial: "" }),
    type: new fields.StringField({ required: true, initial: "String" }),
    ...extra,
  });
}

export function species() {
  return { species: named() };
}

export function career() {
  return { career: named() };
}

export function specialisation() {
  return {
    specialisation: named({
      list: new fields.ArrayField(new fields.StringField(), { required: true, initial: [] }),
    }),
  };
}

export function characteristics() {
  const one = (label, abrev) => new fields.SchemaField({
    value: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    label: new fields.StringField({ required: true, initial: label }),
    abrev: new fields.StringField({ required: true, initial: abrev }),
  });
  return {
    characteristics: new fields.SchemaField({
      Brawn: one("Brawn", "Br"),
      Agility: one("Agility", "Ag"),
      Intellect: one("Intellect", "Int"),
      Cunning: one("Cunning", "Cun"),
      Willpower: one("Willpower", "Will"),
      Presence: one("Presence", "Pr"),
    }),
  };
}

/**
 * The full skill definitions for the world's chosen theme. `CONFIG.FFG.alternateskilllists` is the
 * `arraySkillList` setting, so an edited or custom theme is picked up here without special casing.
 * Falls back to the stock list for the window before init has read the setting.
 */
let themeCache = null;
function themeSkills() {
  const theme = game?.settings?.settings?.has("starwarsffg.skilltheme")
    ? game.settings.get("starwarsffg", "skilltheme")
    : "starwars";
  if (themeCache?.theme === theme) return themeCache.skills;
  const lists = CONFIG.FFG?.alternateskilllists ?? defaultSkillList;
  const chosen = lists.find?.((list) => list.id === theme)
    ?? defaultSkillList.find((list) => list.id === "starwars");
  themeCache = { theme, skills: chosen?.skills ?? {} };
  return themeCache.skills;
}

/**
 * Skills stay a free-form map, for three reasons: the list is configurable per world, the
 * `_prepareSources` pass writes a `<mod>source` array into each skill, and leaving it untyped
 * keeps every `system.skills.*` Active Effect on Foundry's legacy apply path.
 *
 * The theme's definitions are merged back underneath whatever is stored, because that is where a
 * skill gets its `characteristic` - both importers write skills without one
 * (import-helpers.js:529).
 */
export function skills() {
  return { skills: defaultedMap(() => foundry.utils.deepClone(themeSkills())) };
}

/** Modifiers written straight onto the actor, keyed by randomID. */
export function attributes() {
  return { attributes: keyedMap() };
}

/**
 * Descriptive text about the character. Only `features` was ever declared; the rest have been
 * edited by the sheets all along. Rivals and nemeses additionally carry two motivation slots.
 */
export function general({ motivations = false } = {}) {
  const line = () => new fields.StringField({ required: true, blank: true, initial: "" });
  const schema = {
    features: new fields.HTMLField({ required: true, blank: true, initial: "<p></p>" }),
    notes: new fields.HTMLField({ required: true, blank: true, initial: "" }),
    age: line(),
    build: line(),
    eyes: line(),
    gender: line(),
    hair: line(),
    height: line(),
  };
  if (motivations) {
    const slot = () => new fields.SchemaField({
      type: line(), category: line(), description: line(),
    });
    schema.motivation1 = slot();
    schema.motivation2 = slot();
  }
  return { general: new fields.SchemaField(schema) };
}

/** The four motivation lines the character, rival, and nemesis sheets edit. */
export function motivation() {
  const line = () => new fields.StringField({ required: true, blank: true, initial: "" });
  return {
    motivation: new fields.SchemaField({
      desire: line(), fear: line(), flaw: line(), strength: line(),
    }),
  };
}

/** A threshold: a current value, its bounds, and the value after modifiers. */
export function threshold({ min = 0, max = 0 } = {}) {
  return new fields.SchemaField({
    value: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    min: new fields.NumberField({ required: true, nullable: false, initial: min }),
    max: new fields.NumberField({ required: true, nullable: false, initial: max }),
    adjusted: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
  });
}

const num = (initial = 0) => new fields.NumberField({ required: true, nullable: false, initial: initial });

/**
 * The `stats` block a character, nemesis, or rival carries. A rival has no strain track.
 * `medical.uses` is undeclared in template.json but has always been edited by these sheets.
 */
export function characterStats({ strain = true, medical = true } = {}) {
  const schema = {
    wounds: threshold(),
    soak: new fields.SchemaField({ value: num(), adjusted: num() }),
    defence: new fields.SchemaField({ ranged: num(), melee: num(), adjusted: num() }),
    encumbrance: new fields.SchemaField({ value: num(), max: num(), adjusted: num() }),
    forcePool: new fields.SchemaField({ value: num(), max: num(), adjusted: num() }),
    credits: numberStat({ label: "Credits" }),
  };
  if (strain) schema.strain = threshold();
  if (medical) schema.medical = new fields.SchemaField({ uses: num() });
  return { stats: new fields.SchemaField(schema) };
}
