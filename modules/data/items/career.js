import { core } from "./_templates.js";
import { keyedMap, slotMap } from "../fields.js";

export class CareerData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...core(),
      specializations: keyedMap(),
      signatureabilities: keyedMap(),
      careerSkills: slotMap("careerSkill", 8, () => "(none)"),
    };
  }
}
