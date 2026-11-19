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
      stats: new fields.SchemaField({
        cost: numberStat({ label: "Cost" }),
        consumables: consumables(),
      }),
    };
  }
}
