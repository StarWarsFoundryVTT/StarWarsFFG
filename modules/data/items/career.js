import { core } from "./_templates.js";
import { keyedMap, slotMap } from "../fields.js";

export class CareerData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...core(),
      specializations: keyedMap(),
      signatureabilities: keyedMap(),
      // copies of gear granted to a character when the career is added
      startingItems: keyedMap(),
      careerSkills: slotMap("careerSkill", 8, () => "(none)"),
    };
  }
}
