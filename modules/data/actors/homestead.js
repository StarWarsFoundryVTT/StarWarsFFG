import { attributes, biography, metaOnly } from "./_templates.js";
import { numberStat } from "../fields.js";

const fields = foundry.data.fields;

const consumables = () => new fields.SchemaField({
  value: new fields.NumberField({ required: true, nullable: false, initial: 1 }),
  duration: new fields.StringField({ required: true, initial: "months" }),
  type: new fields.StringField({ required: true, initial: "Number" }),
  label: new fields.StringField({ required: true, initial: "SWFFG.Consumables" }),
});

export class HomesteadData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...biography(),
      ...attributes(),
      ...metaOnly(),
      // template.json declares these at the top level, but the sheet reads and writes them under
      // `stats`. Both are kept so no existing homestead loses anything; the mismatch is its own bug.
      cost: numberStat({ label: "Cost" }),
      consumables: consumables(),
      stats: new fields.SchemaField({
        cost: numberStat({ label: "Cost" }),
        consumables: consumables(),
      }),
    };
  }
}
