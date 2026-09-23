import { basic, core } from "./_templates.js";

const fields = foundry.data.fields;

export class MotivationData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...core(),
      ...basic(),
      // one of ambition, cause, relationship or belief
      type: new fields.StringField({ required: true, initial: "ambition" }),
    };
  }
}
