import { ActorSheetFFG } from "./actor-sheet-ffg.js";
import ActorOptions from "./actor-ffg-options.js";

export class AdversarySheetFFG extends ActorSheetFFG {
  constructor(...args) {
    super(...args);
  }

  /** @override */
  get template() {
    const path = "systems/starwarsffg/templates/actors";
    return `${path}/ffg-adversary-sheet.html`;
  }

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["starwarsffg", "sheet", "actor", "adversary"],
      template: "systems/starwarsffg/templates/actors/ffg-adversary-sheet.html",
      width: 710,
      height: 650,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "characteristics" }],
      scrollY: [".tableWithHeader", ".tab", ".skillsGrid", ".skillsTablesGrid"],
    });
  }

  getData() {
    const data = super.getData();
    switch (this.actor.data.type) {
      case "character":
        this.position.width = 595;
        this.position.height = 783;
        if (data.limited) {
          this.position.height = 165;
        }

        // we need to update all specialization talents with the latest talent information
        if (!this.actor.data.flags.starwarsffg?.loaded) {
          super._updateSpecialization(data);
        }

        break;
      default:
    }

    data.items = this.actor.items.map((item) => item.data);

    return data;
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    if (!this.options.editable) return;

    if (this.actor.data.type === "character") {
      this.sheetoptions.clear();
      this.sheetoptions.register("enableAutoSoakCalculation", {
        name: game.i18n.localize("SWFFG.EnableSoakCalc"),
        hint: game.i18n.localize("SWFFG.EnableSoakCalcHint"),
        type: "Boolean",
        default: true,
      });
      this.sheetoptions.register("enableForcePool", {
        name: game.i18n.localize("SWFFG.EnableForcePool"),
        hint: game.i18n.localize("SWFFG.EnableForcePoolHint"),
        type: "Boolean",
        default: true,
      });
      this.sheetoptions.register("talentSorting", {
        name: game.i18n.localize("SWFFG.EnableSortTalentsByActivation"),
        hint: game.i18n.localize("SWFFG.EnableSortTalentsByActivationHint"),
        type: "Array",
        default: 0,
        options: [game.i18n.localize("SWFFG.UseGlobalSetting"), game.i18n.localize("SWFFG.OptionValueYes"), game.i18n.localize("SWFFG.OptionValueNo")],
      });
    }
  }
}
