import EmbeddedItemHelpers from "../helpers/embeddeditem-helpers.js";

export default class ItemBaseFFG extends Item {
  async update(data, options = {}) {
    if (!this.flags?.starwarsffg?.ffgTempId || (this.flags?.starwarsffg?.ffgTempId === this._id && !this.isTemp) || this.flags?.starwarsffg?.ffgIsOwned) {
      super.update(data, options);
      // if (this.compendium) {
      //   return this.sheet.render(true);
      // }
      return;
    } else {
      const preState = Object.values(this.apps)[0]._state;

      await EmbeddedItemHelpers.updateRealObject(this, data);

      if (this.flags?.starwarsffg?.ffgParent?.isCompendium || Object.values(this.apps)[0]._state !== preState) {
        if (this.flags?.starwarsffg?.ffgParent?.ffgUuid) {
          this.sheet.render(false);
        }
      } else {
        let me = this;

        // we're working on an embedded item
        await this.sheet.render(true);
        const appId = this.data?.flags?.starwarsffg?.ffgParentApp;
        if (appId) {
          const newData = ui.windows[appId].object.data.data;
          newData[this.data.flags.starwarsffg.ffgTempItemType][this.data.flags.starwarsffg.ffgTempItemIndex] = mergeObject(newData[this.data.flags.starwarsffg.ffgTempItemType][this.data.flags.starwarsffg.ffgTempItemIndex], this.data);
          await ui.windows[appId].render(true, { action: "ffgUpdate", data: newData });
        }
        return;
      }
    }
  }
}
