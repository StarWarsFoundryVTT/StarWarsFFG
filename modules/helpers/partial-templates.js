export default class TemplateHelpers {
  static async preload() {
    const templatePaths = [
      "systems/genesysk2/templates/parts/shared/ffg-modifiers.html",
      "systems/genesysk2/templates/parts/actor/ffg-skills.html",
      "systems/genesysk2/templates/parts/actor/ffg-weapon-armor-gear.html",
      "systems/genesysk2/templates/parts/actor/ffg-homestead-upgrades.html",
      "systems/genesysk2/templates/parts/actor/ffg-homestead-storage.html",
      "systems/genesysk2/templates/parts/actor/ffg-talents.html",
      "systems/genesysk2/templates/parts/actor/ffg-abilities.html",
      "systems/genesysk2/templates/parts/actor/ffg-forcepowers.html",
      "systems/genesysk2/templates/parts/actor/ffg-criticalinjury.html",
      "systems/genesysk2/templates/parts/shared/ffg-block.html",
      "systems/genesysk2/templates/parts/actor/ffg-signatureability.html",
      "systems/genesysk2/templates/chat/roll-forcepower-card.html",
      "systems/genesysk2/templates/chat/roll-weapon-card.html",
      "systems/genesysk2/templates/chat/roll-vehicle-card.html",
      "systems/genesysk2/templates/parts/shared/ffg-tabs.html",
      "systems/genesysk2/templates/parts/actor/ffg-healingitem.html"
    ];

    return loadTemplates(templatePaths);
  }
}
