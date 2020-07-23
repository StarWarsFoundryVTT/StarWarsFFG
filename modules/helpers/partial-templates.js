export default class TemplateHelpers {
  static async preload() {
    const templatePaths = ["systems/starwarsffg/templates/parts/shared/ffg-modifiers.html", "systems/starwarsffg/templates/parts/actor/ffg-skills.html", "systems/starwarsffg/templates/parts/actor/ffg-weapon-armor-gear.html", "systems/starwarsffg/templates/parts/actor/ffg-talents.html", "systems/starwarsffg/templates/parts/actor/ffg-forcepowers.html"];

    return loadTemplates(templatePaths);
  }
}
