export default class TemplateHelpers {
  static async preload() {
    const templatePaths = [
      "systems/starwarsffg/templates/parts/shared/ffg-modifiers.html",
      "systems/starwarsffg/templates/parts/shared/ffg-sources.html",
      "systems/starwarsffg/templates/parts/shared/ffg-tags.html",
      "systems/starwarsffg/templates/parts/shared/ffg-effects.html",
      "systems/starwarsffg/templates/parts/actor/ffg-skills.html",
      "systems/starwarsffg/templates/parts/actor/ffg-weapon-armor-gear.html",
      "systems/starwarsffg/templates/parts/actor/ffg-vehicle-weapon-attachments.html",
      "systems/starwarsffg/templates/parts/ffg-qualities-attachments-mods.html",
      "systems/starwarsffg/templates/parts/ffg-mods.html",
      "systems/starwarsffg/templates/items/dialogs/ffg-mod.html",
      "systems/starwarsffg/templates/items/dialogs/ffg-modification.html",
      "systems/starwarsffg/templates/parts/actor/ffg-vehicle-cargo.html",
      "systems/starwarsffg/templates/parts/actor/ffg-vehicle-crew.html",
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
      "systems/starwarsffg/templates/combat/ffg-combat-tracker-header.html",
      "systems/starwarsffg/templates/combat/ffg-combat-tracker-body.html",
      "systems/starwarsffg/templates/combat/ffg-combat-tracker-footer.html",
      "systems/starwarsffg/templates/chat/parts/item/ffg-header.html",
      "systems/starwarsffg/templates/chat/parts/item/ffg-footer.html",
    ];
    return foundry.applications.handlebars.loadTemplates(templatePaths);
  }
}
