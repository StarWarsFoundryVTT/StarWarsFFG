import { core } from "./_templates.js";
import { keyedMap } from "../fields.js";

const fields = foundry.data.fields;

export class SpeciesData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...core(),
      talents: keyedMap(),
      abilities: keyedMap(),
      species: keyedMap(),
      startingXP: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
    };
  }
}
