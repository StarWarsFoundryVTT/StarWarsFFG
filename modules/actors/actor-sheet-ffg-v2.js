import { ActorSheetFFG } from "./actor-sheet-ffg.js";

export class ActorSheetFFGV2 extends ActorSheetFFG {
  constructor(...args) {
    super(...args);
  }

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["genesysk2", "sheet", "actor", "v2"],
      template: "systems/genesysk2/templates/actors/ffg-character-sheet.html",
      width: 710,
      height: 650,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "characteristics" }],
      scrollY: [".tableWithHeader", ".tab", ".skillsGrid", ".skillsTablesGrid"],
    });
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
  }
}
