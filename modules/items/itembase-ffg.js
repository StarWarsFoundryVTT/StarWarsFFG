import EmbeddedItemHelpers from "../helpers/embeddeditem-helpers.js";
import ItemHelpers from "../helpers/item-helpers.js";

export default class ItemBaseFFG extends Item {
  async update(data, options = {}) {
    if ((!this.flags?.starwarsffg?.ffgTempId && this.flags?.starwarsffg?.ffgTempId !== null) || (this.flags?.starwarsffg?.ffgTempId === this._id && this._id !== null && !this.isTemp) || (this.flags?.starwarsffg?.ffgIsOwned && !this.flags?.starwarsffg?.ffgIsTemp)) {
      CONFIG.logger.debug("Updating real item", this, data);
      if (typeof data.flags?.clickfromparent === "undefined" && typeof this.flags?.clickfromparent !== "undefined") data.flags.clickfromparent = this.flags.clickfromparent
      await super.update(ItemHelpers.normalizeDataStructure(data), options);
      // if (this.compendium) {
      //   return this.sheet.render(true);
      // }
      return;
    } else {
      CONFIG.logger.debug("Updating fake item item", this, data);
      const preState = Object.values(this.apps)[0]?._state;
      await EmbeddedItemHelpers.updateRealObject(this, data);

      if (this.flags?.starwarsffg?.ffgParent?.isCompendium || Object.values(this.apps)[0]._state !== preState) {
        if (this.flags?.starwarsffg?.ffgParent?.ffgUuid) {
          this.sheet.render(false);
        }
      } else {
        let me = this;

        // we're working on an embedded item
        await this.sheet.render(true, {action: "ffgUpdate", data: data});
        const appId = this?.flags?.starwarsffg?.ffgParentApp;
        if (appId) {
          const newData = ui.windows[appId].object;
          newData[this.flags.starwarsffg.ffgTempItemType][this.flags.starwarsffg.ffgTempItemIndex] = mergeObject(newData[this.flags.starwarsffg.ffgTempItemType][this.flags.starwarsffg.ffgTempItemIndex], this);
          await ui.windows[appId].render(true, { action: "ffgUpdate", data: newData });
        }
        return;
      }
    }
  }
}
