import { core } from "./_templates.js";

const fields = foundry.data.fields;

export class CriticalInjuryData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...core(),
      min: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
      max: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
      severity: new fields.NumberField({ required: true, nullable: false, initial: 1 }),
    };
  }
}
