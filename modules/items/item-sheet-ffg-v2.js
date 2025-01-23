import { ItemSheetFFG } from "./item-sheet-ffg.js";

export class ItemSheetFFGV2 extends ItemSheetFFG {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["starwarsffg", "sheet", "item", "v2"],
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "attributes" }],
      scrollY: [".sheet-body", ".tab"],
    });
  }

  getData() {
    const data = super.getData();
    return data;
  }
}
