import { basic, core, equippable, hardpoints, itemattachments, qualities } from "./_templates.js";
import { numberStat, stringStat } from "../fields.js";

const fields = foundry.data.fields;

export class ShipWeaponData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...core(),
      ...basic(),
      ...hardpoints(),
      ...equippable(),
      ...itemattachments(),
      ...qualities(),
      label: new fields.StringField({ required: true, initial: "Ship Weapon" }),
      firingarc: new fields.SchemaField({
        fore: new fields.BooleanField({ required: true, initial: false }),
        aft: new fields.BooleanField({ required: true, initial: false }),
        port: new fields.BooleanField({ required: true, initial: false }),
        starboard: new fields.BooleanField({ required: true, initial: false }),
        dorsal: new fields.BooleanField({ required: true, initial: false }),
        ventral: new fields.BooleanField({ required: true, initial: false }),
      }),
      skill: new fields.SchemaField({
        value: new fields.StringField({ required: true, blank: true, initial: "" }),
        type: new fields.StringField({ required: true, initial: "String" }),
        label: new fields.StringField({ required: true, initial: "Skill" }),
        useBrawn: new fields.BooleanField({ required: true, initial: false }),
      }),
      characteristic: stringStat(),
      damage: numberStat({ label: "Damage", abrev: "Dam" }),
      crit: numberStat({ label: "Critical Rating", abrev: "Crit" }),
      range: stringStat({ initial: "Short", label: "Range", adjusted: true }),
      special: stringStat({ label: "Special" }),
    };
  }
}
