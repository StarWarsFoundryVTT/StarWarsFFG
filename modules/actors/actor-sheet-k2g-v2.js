import { ActorSheetFFG } from "./actor-sheet-ffg.js";

export class ActorSheetK2G extends ActorSheetFFG {
  constructor(...args) {
    super(...args);
  }

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["genesysk2", "starwarsffg", "sheet", "actor", "K2G"], // ici si K² pas la bonne présentation ', "v2"' pour la forme différente (v2)
      template: "systems/genesysk2/templates/actors/k2g-character-sheet.html",
      width: 750,
      height: 650,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "characteristics" }],
      scrollY: [".tableWithHeader", ".tab", ".skillsGrid", ".skillsTablesGrid"],
    });
  }

  get template() {
    const path = "systems/genesysk2/templates/actors";
    let front = "ffg"
    if(this.actor.type=='character') front = "k2g"    
    return `${path}/${front}-${this.actor.type}-sheet.html`;
  }
  getData() {
    const data = super.getData();
    return data;
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    html.find(".cmd").on("click",(html) => { 
      console.log(this.actor, html) 
    })
  }
}
