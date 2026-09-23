import { core, rarity } from "./_templates.js";
import { numberStat } from "../fields.js";

export class HomesteadUpgradeData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      // its sheet has always edited a description, modifiers, a price and a restricted flag,
      // none of which template.json declared
      ...core(),
      // no `adjusted` on either: item-ffg.js has no branch for this type, so nothing ever
      // derives a value to put there
      price: numberStat({ label: "Price", adjusted: false }),
      rarity: rarity({ adjusted: false }),
    };
  }
}
