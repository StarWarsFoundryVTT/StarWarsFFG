import { attributes, biography, characterStats, characteristics, general, metaOnly,
         motivation, skills, species } from "./_templates.js";

export class RivalData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...biography(),
      ...species(),
      // template.json gave a rival no strain track, but swa-importer.js:432 writes one for every
      // adversary it imports, so the schema has to carry it
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
