import { basic, core, equippable, hardpoints, itemattachments, qualities } from "./_templates.js";
import { numberStat, stringStat } from "../fields.js";

const fields = foundry.data.fields;

export class WeaponData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...core(),
      ...basic(),
      ...hardpoints(),
      ...equippable(),
      ...itemattachments(),
      ...qualities(),
      skill: new fields.SchemaField({
        value: new fields.StringField({ required: true, blank: true, initial: "Ranged: Light" }),
        type: new fields.StringField({ required: true, initial: "String" }),
        label: new fields.StringField({ required: true, initial: "Skill" }),
        // set by the importer for weapons whose damage comes from Brawn
        useBrawn: new fields.BooleanField({ required: true, initial: false }),
      }),
      // which characteristic adds to damage, if any - a dropdown on the sheet
      characteristic: stringStat(),
      // the item status dropdown, keyed into CONFIG.FFG.itemstatus
      status: new fields.StringField({ required: true, blank: true, initial: "None" }),
      damage: numberStat({ label: "Damage", abrev: "Dam" }),
      crit: numberStat({ label: "Critical Rating", abrev: "Crit" }),
      range: stringStat({ initial: "Short", label: "Range", adjusted: true }),
      special: stringStat({ label: "Special" }),
      ammo: new fields.SchemaField({
        max: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
        value: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
      }),
    };
  }
}
