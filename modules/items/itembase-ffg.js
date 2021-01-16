import EmbeddedItemHelpers from "../helpers/embeddeditem-helpers.js";

export default class ItemBaseFFG extends Item {
  async update(data, options = {}) {
    if (!this.data?.flags?.ffgTempId) {
      super.update(data, options);
      if (this.compendium) {
        return this.sheet.render(true);
      }
      return;
    } else {
      await EmbeddedItemHelpers.updateRealObject(this, data);

      if (this.data.flags?.ffgParent?.isCompendium) {
      } else {
        this.sheet.render(false);
        return this;
      }
    }
  }
}
