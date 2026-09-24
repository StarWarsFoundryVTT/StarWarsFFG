import { attributes, biography, career, characterStats, characteristics, general, metaOnly,
         motivation, skills, species, specialisation } from "./_templates.js";
import { keyedMap, numberStat } from "../fields.js";

const fields = foundry.data.fields;

export class CharacterData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...biography(),
      ...species(),
      ...career(),
      ...specialisation(),
      ...characterStats(),
      ...characteristics(),
      ...skills(),
      ...attributes(),
      ...general(),
      ...motivation(),
      ...metaOnly(),
      // not the real one (which is in characterStats)
      encumbrance: numberStat({ label: "Encumbrance", abrev: "Encum" }),
      obligation: numberStat({ label: "Obligation", adjusted: false }),
      duty: numberStat({ label: "Duty", adjusted: false }),
      morality: numberStat({ label: "Morality", adjusted: false }),
      conflict: numberStat({ label: "Conflict", adjusted: false }),
      // keyed by randomID, each {type, magnitude}; the character sheet's add/remove duty and
      // obligation controls write them and groupmanager-ffg.js:84 reads them
      obligationlist: keyedMap(),
      dutylist: keyedMap(),
      experience: new fields.SchemaField({
        total: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
        available: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
      }),
    };
  }
}
