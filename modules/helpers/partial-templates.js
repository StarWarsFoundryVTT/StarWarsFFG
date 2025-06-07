export default class TemplateHelpers {
  static async preload() {
    const templatePaths = [
      "systems/starwarsffg/templates/parts/shared/ffg-modifiers.hbs",
      "systems/starwarsffg/templates/parts/shared/ffg-sources.hbs",
      "systems/starwarsffg/templates/parts/actor/ffg-skills.hbs",
      "systems/starwarsffg/templates/parts/actor/ffg-weapon-armor-gear.hbs",
      "systems/starwarsffg/templates/parts/actor/ffg-vehicle-weapon-attachments.hbs",
      "systems/starwarsffg/templates/parts/ffg-qualities-attachments-mods.hbs",
      "systems/starwarsffg/templates/parts/ffg-mods.hbs",
      "systems/starwarsffg/templates/items/dialogs/ffg-mod.hbs",
      "systems/starwarsffg/templates/items/dialogs/ffg-modification.hbs",
      "systems/starwarsffg/templates/parts/actor/ffg-vehicle-cargo.hbs",
      "systems/starwarsffg/templates/parts/actor/ffg-vehicle-crew.hbs",
      "systems/starwarsffg/templates/parts/actor/ffg-homestead-upgrades.hbs",
      "systems/starwarsffg/templates/parts/actor/ffg-homestead-storage.hbs",
      "systems/starwarsffg/templates/parts/actor/ffg-talents.hbs",
      "systems/starwarsffg/templates/parts/actor/ffg-abilities.hbs",
      "systems/starwarsffg/templates/parts/actor/ffg-forcepowers.hbs",
      "systems/starwarsffg/templates/parts/actor/ffg-criticalinjury.hbs",
      "systems/starwarsffg/templates/parts/shared/ffg-block.hbs",
      "systems/starwarsffg/templates/parts/actor/ffg-signatureability.hbs",
      "systems/starwarsffg/templates/chat/roll-forcepower-card.hbs",
      "systems/starwarsffg/templates/chat/roll-weapon-card.hbs",
      "systems/starwarsffg/templates/chat/roll-vehicle-card.hbs",
      "systems/starwarsffg/templates/parts/shared/ffg-tabs.hbs",
      "systems/starwarsffg/templates/parts/actor/ffg-healingitem.hbs",
      "systems/starwarsffg/templates/dialogs/combat-tracker.hbs",
      "systems/starwarsffg/templates/chat/parts/item/ffg-header.hbs",
      "systems/starwarsffg/templates/chat/parts/item/ffg-footer.hbs",
    ];

    return loadTemplates(templatePaths);
  }
}
