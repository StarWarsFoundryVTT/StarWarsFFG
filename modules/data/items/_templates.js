import { embeddedItems, keyedMap, numberStat } from "../fields.js";

const fields = foundry.data.fields;

/**
 * templates for the data model
 */

/** Tags and source books, on every item. */
export function metaOnly() {
  return {
    metadata: new fields.SchemaField({
      tags: new fields.ArrayField(new fields.StringField(), { required: true, initial: [] }),
      sources: new fields.ArrayField(new fields.StringField(), { required: true, initial: [] }),
    }),
  };
}

/** Description, modifiers, and metadata - everything but homestead upgrades carries these. */
export function core() {
  return {
    description: new fields.HTMLField({ required: true, blank: true, initial: "" }),
    attributes: keyedMap(),
    ...metaOnly(),
  };
}

/** What a physical item costs, weighs, and how many of it you have. */
export function basic() {
  return {
    quantity: numberStat({ initial: 1, label: "Quantity", abrev: "Qty", adjusted: false }),
    encumbrance: numberStat({ label: "Encumbrance", abrev: "Encum" }),
    price: numberStat({ label: "Price" }),
    rarity: rarity(),
  };
}

/**
 * Rarity carries a restricted flag
 */
export function rarity({ adjusted = true } = {}) {
  const schema = {
    value: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    isrestricted: new fields.BooleanField({ required: true, initial: false }),
    type: new fields.StringField({ required: true, initial: "Number" }),
    label: new fields.StringField({ required: true, initial: "Rarity" }),
  };
  if (adjusted) {
    schema.adjusted = new fields.NumberField({ required: true, nullable: false, initial: 0 });
  }
  return new fields.SchemaField(schema);
}

/** Hard points, for anything that takes attachments. */
export function hardpoints() {
  return {
    hardpoints: numberStat({ label: "Hard Points", abrev: "HP" }),
  };
}

/** Whether the item can be worn or carried, and whether it currently is. */
export function equippable() {
  return {
    equippable: new fields.SchemaField({
      value: new fields.BooleanField({ required: true, initial: true }),
      type: new fields.StringField({ required: true, initial: "Boolean" }),
      equipped: new fields.BooleanField({ required: true, initial: false }),
    }),
  };
}

/** Attachments installed on the item. */
export function itemattachments() {
  return {
    itemattachment: embeddedItems(),
  };
}

/**
 * Qualities on the item. `adjusteditemmodifer` is spelled as template.json spells it; the array
 * the system actually computes is `adjusteditemmodifier`, which is derived and left off-schema.
 */
export function qualities() {
  return {
    itemmodifier: embeddedItems(),
    adjusteditemmodifer: embeddedItems(),
  };
}
