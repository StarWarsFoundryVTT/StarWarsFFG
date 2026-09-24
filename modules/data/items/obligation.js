import { basic, core } from "./_templates.js";

const fields = foundry.data.fields;

export class ObligationData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...core(),
      ...basic(),
      // which list it lands in: duty, obligation or morality
      type: new fields.StringField({ required: true, initial: "duty" }),
      magnitude: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
      subtype: new fields.StringField({ required: true, blank: true, initial: "" }),
    };
  }
}
