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

      if (this.data.flags?.ffgParent?.isCompendium || Object.values(this.apps)[0]._state === Application.RENDER_STATES.RENDERED) {
      } else {
        this.sheet.render(true);
        return this;
      }
    }
  }
}
