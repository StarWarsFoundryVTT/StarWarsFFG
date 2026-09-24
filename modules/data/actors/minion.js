import { attributes, biography, characterStats, characteristics, metaOnly, skills } from "./_templates.js";
import { numberStat } from "../fields.js";

const fields = foundry.data.fields;

export class MinionData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...biography(),
      ...characterStats({ medical: false }),
      ...characteristics(),
      ...skills(),
      ...attributes(),
      ...metaOnly(),
      quantity: new fields.SchemaField({
        value: new fields.NumberField({ required: true, nullable: false, initial: 1 }),
        max: new fields.NumberField({ required: true, nullable: false, initial: 1 }),
        type: new fields.StringField({ required: true, initial: "Number" }),
        label: new fields.StringField({ required: true, initial: "Quantity" }),
        abrev: new fields.StringField({ required: true, initial: "Qty" }),
      }),
      unit_wounds: numberStat({ label: "Unit Wounds", adjusted: false }),
    };
  }
}
