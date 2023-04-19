import {activeEffectChanges} from "../config/ffg-activeEffects.js";

export default class FFGActiveEffectConfig extends ActiveEffectConfig {
  // TODO: can we remove this UI?
  get template() {
    return "systems/starwarsffg/templates/items/ffg-active-effect-config.html";
  }

  getData() {
    console.log("in my code")
    const sheetData = super.getData();
    sheetData.activeEffectChanges = activeEffectChanges;
    return sheetData;
  }
}
