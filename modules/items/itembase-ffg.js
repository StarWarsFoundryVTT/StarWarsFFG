import EmbeddedItemHelpers from "../helpers/embeddeditem-helpers.js";

export default class ItemBaseFFG extends Item {
  async update(data, options = {}) {
    if (!this.data?.flags?.ffgTempId) {
      return super.update(data, options);
    } else {
      await EmbeddedItemHelpers.updateRealObject(this, data);

      this.sheet.render(false);
    }
  }
}
