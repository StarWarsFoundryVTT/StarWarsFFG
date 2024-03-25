import EmbeddedItemHelpers from "../helpers/embeddeditem-helpers.js";
import ItemHelpers from "../helpers/item-helpers.js";

export default class ItemBaseFFG extends Item {
  async update(data, options = {}) {
    if ((!this.flags?.genesysk2?.ffgTempId && this.flags?.genesysk2?.ffgTempId !== null) || (this.flags?.genesysk2?.ffgTempId === this._id && this._id !== null && !this.isTemp) || (this.flags?.genesysk2?.ffgIsOwned && !this.flags?.genesysk2?.ffgIsTemp)) {
      CONFIG.logger.debug("Updating real item", this, data);
      await super.update(ItemHelpers.normalizeDataStructure(data), options);
      // if (this.compendium) {
      //   return this.sheet.render(true);
      // }
      return;
    } else {
      CONFIG.logger.debug("Updating fake item item", this, data);
      const preState = Object.values(this.apps)[0]?._state;
      await EmbeddedItemHelpers.updateRealObject(this, data);

      if (this.flags?.genesysk2?.ffgParent?.isCompendium || Object.values(this.apps)[0]._state !== preState) {
        if (this.flags?.genesysk2?.ffgParent?.ffgUuid) {
          this.sheet.render(false);
        }
      } else {
        let me = this;

        // we're working on an embedded item
        await this.sheet.render(true, {action: "ffgUpdate", data: data});
        const appId = this?.flags?.genesysk2?.ffgParentApp;
        if (appId) {
          const newData = ui.windows[appId].object;
          newData[this.flags.genesysk2.ffgTempItemType][this.flags.genesysk2.ffgTempItemIndex] = mergeObject(newData[this.flags.genesysk2.ffgTempItemType][this.flags.genesysk2.ffgTempItemIndex], this);
          await ui.windows[appId].render(true, { action: "ffgUpdate", data: newData });
        }
        return;
      }
    }
  }
}
