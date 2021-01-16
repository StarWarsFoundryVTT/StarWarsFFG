export default class TemplateHelpers {
  static async preload() {
    const templatePaths = ["systems/starwarsffg/templates/parts/shared/ffg-modifiers.html", "systems/starwarsffg/templates/parts/actor/ffg-skills.html", "systems/starwarsffg/templates/parts/actor/ffg-weapon-armor-gear.html", "systems/starwarsffg/templates/parts/actor/ffg-talents.html", "systems/starwarsffg/templates/parts/actor/ffg-forcepowers.html", "systems/starwarsffg/templates/parts/actor/ffg-criticalinjury.html", "systems/starwarsffg/templates/parts/shared/ffg-block.html", "systems/starwarsffg/templates/parts/actor/ffg-signatureability.html", "systems/starwarsffg/templates/chat/roll-forcepower-card.html", "systems/starwarsffg/templates/chat/roll-weapon-card.html", "systems/starwarsffg/templates/parts/shared/ffg-tabs.html"];

    return loadTemplates(templatePaths);
  }
}
