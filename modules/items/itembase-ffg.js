import ItemHelpers from "../helpers/item-helpers.js";

export default class ItemBaseFFG extends Item {
  async update(data, options = {}) {
    if (!Object.keys(data).includes("flags")) {
      data.flags = {};
    }
    if (!Object.keys(data).includes("ownership") && typeof data.flags?.clickfromparent === "undefined" && typeof this.flags?.clickfromparent !== "undefined") {
      data.flags.clickfromparent = this.flags.clickfromparent
    }
    await super.update(ItemHelpers.normalizeDataStructure(data), options);
  }
}
