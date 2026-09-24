import { core } from "./_templates.js";
import { stringStat } from "../fields.js";

const fields = foundry.data.fields;

export class TalentData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...core(),
      activation: stringStat({ initial: "Passive", label: "Activation" }),
      ranks: new fields.SchemaField({
        ranked: new fields.BooleanField({ required: true, initial: false }),
        current: new fields.NumberField({ required: true, nullable: false, initial: 1 }),
        min: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
      }),
      isForceTalent: new fields.BooleanField({ required: true, initial: false }),
      isConflictTalent: new fields.BooleanField({ required: true, initial: false }),
      tier: new fields.NumberField({ required: true, nullable: false, initial: 1 }),
      // ids of the specializations this talent appears in
      trees: new fields.ArrayField(new fields.StringField(), { required: true, initial: [] }),
      longDesc: new fields.HTMLField({ required: true, blank: true, initial: "" }),
    };
  }
}
