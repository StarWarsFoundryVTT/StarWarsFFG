import { attributes, biography, characterStats, characteristics, general, metaOnly,
         motivation, skills, species } from "./_templates.js";

export class NemesisData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...biography(),
      ...species(),
      ...characterStats(),
      ...characteristics(),
      ...skills(),
      ...attributes(),
      ...general({ motivations: true }),
      ...motivation(),
      ...metaOnly(),
    };
  }
}
