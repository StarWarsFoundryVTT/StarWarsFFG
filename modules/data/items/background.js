import { basic, core } from "./_templates.js";

const fields = foundry.data.fields;

export class BackgroundData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...core(),
      ...basic(),
      // one of culture, hook or attitude
      type: new fields.StringField({ required: true, initial: "culture" }),
    };
  }
}
