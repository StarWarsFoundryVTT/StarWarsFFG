import { core } from "./_templates.js";

const fields = foundry.data.fields;

export class AbilityData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...core(),
      // id of the species that granted this ability, so removing the species takes it away again
      fromSpecies: new fields.StringField({ required: true, blank: true, initial: "" }),
    };
  }
}
