import { core } from "./_templates.js";
import { slotMap } from "../fields.js";

const fields = foundry.data.fields;

export class SpecializationData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...core(),
      talents: slotMap("talent", 20),
      careerSkills: slotMap("careerSkill", 5, () => "(none)"),
      universal: new fields.BooleanField({ required: true, initial: false }),
      // the talent tree's edit toggle, submitted as a hidden input on the sheet
      isEditing: new fields.BooleanField({ required: true, initial: false }),
    };
  }
}
