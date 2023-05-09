export default class TemplateHelpers {
  static async preload() {
    const templatePaths = [
      "systems/starwarsffg/templates/parts/shared/ffg-modifiers.html",
      "systems/starwarsffg/templates/parts/shared/ffg-active-effects.html",
      "systems/starwarsffg/templates/items/ffg-active-effect-view.html",
      "systems/starwarsffg/templates/parts/shared/ffg-test-attachment-mod.html",
      "systems/starwarsffg/templates/parts/shared/ffg-test-active-effects.html",
      "systems/starwarsffg/templates/parts/actor/ffg-skills.html",
      "systems/starwarsffg/templates/parts/actor/ffg-weapon-armor-gear.html",
      "systems/starwarsffg/templates/parts/actor/ffg-homestead-upgrades.html",
      "systems/starwarsffg/templates/parts/actor/ffg-homestead-storage.html",
      "systems/starwarsffg/templates/parts/actor/ffg-talents.html",
      "systems/starwarsffg/templates/parts/actor/ffg-abilities.html",
      "systems/starwarsffg/templates/parts/actor/ffg-forcepowers.html",
      "systems/starwarsffg/templates/parts/actor/ffg-criticalinjury.html",
      "systems/starwarsffg/templates/parts/shared/ffg-block.html",
      "systems/starwarsffg/templates/parts/actor/ffg-signatureability.html",
      "systems/starwarsffg/templates/chat/roll-forcepower-card.html",
      "systems/starwarsffg/templates/chat/roll-weapon-card.html",
      "systems/starwarsffg/templates/chat/roll-vehicle-card.html",
      "systems/starwarsffg/templates/parts/shared/ffg-tabs.html",
      "systems/starwarsffg/templates/parts/actor/ffg-healingitem.html",
      "systems/starwarsffg/templates/items/tooltips/ffg-attachment.html",
      "systems/starwarsffg/templates/items/embedded/partial/ffg-modifier.html",
        "systems/starwarsffg/templates/items/embedded/partial/ffg-mod.html"
    ];

    return loadTemplates(templatePaths);
  }
}
