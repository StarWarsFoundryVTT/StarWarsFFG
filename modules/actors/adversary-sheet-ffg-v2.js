import { ActorSheetFFGV2 } from "./actor-sheet-ffg-v2.js";
import { AdversarySheetFFG } from "./adversary-sheet-ffg.js";

/** ApplicationV2 version of the alternative adversary actor sheet. */
export class AdversarySheetFFGV2 extends ActorSheetFFGV2 {
  static DEFAULT_OPTIONS = {
    classes: ["adversary"],
    position: {
      width: 595,
      height: 783,
    },
  };

  get template() {
    return "systems/starwarsffg/templates/actors/ffg-adversary-sheet.html";
  }

  async _prepareContext(options) {
    const data = await super._prepareContext(options);
    if (this.actor.type === "character") {
      this.position.width = 595;
      this.position.height = data.limited ? 165 : 783;
      if (!this.actor.flags.starwarsffg?.loaded) await this._updateSpecialization(data);
    }
    data.items = this.actor.items.map(item => item);
    return data;
  }

  _activateLegacyListeners(html) {
    super._activateLegacyListeners(html);
    return AdversarySheetFFG.prototype._activateAdversaryListeners.call(this, html);
  }
}
