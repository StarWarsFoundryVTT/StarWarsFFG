import ImportHelpers from "../../import-helpers.js";

export default class ItemDescriptors {
  static getMetaData() {
    return {
      displayName: 'Item Modifiers',
      className: "ItemModifiers",
      itemName: "itemmodifier",
      localizationName: "TYPES.Item.itemmodifier",
      fileNames: ["ItemDescriptors.xml"],
      filesAreDir: false,
      phase: 2,
    };
  }

  static async Import(xml) {
    const base = JXON.xmlToJs(xml);
    let items = base.ItemDescriptors.ItemDescriptor;
    let totalCount = items.length;
    let currentCount = 0;
    let pack;
    CONFIG.logger.debug(`Starting Oggdude Item Descriptor Import`);
    $(".import-progress.itemmodifier").toggleClass("import-hidden");
    const packMap = {
      "armor": await ImportHelpers.getCompendiumPack("Item", "oggdude.ArmorMods"),
      "weapon": await ImportHelpers.getCompendiumPack("Item", "oggdude.WeaponMods"),
      "all": await ImportHelpers.getCompendiumPack("Item", "oggdude.GenericMods"),
      "gear": await ImportHelpers.getCompendiumPack("Item", "oggdude.GenericMods"),
      "vehicle": await ImportHelpers.getCompendiumPack("Item", "oggdude.VehicleMods"),
    };

    await ImportHelpers.asyncForEach(items, async (item) => {
      try {
        let data;
        if (Array.isArray(item.Type)) item.Type = item.Type[0];
        if (item?.Type?.toLowerCase() === "vehicle") {
          data = ImportHelpers.prepareBaseObject(item, "shipattachment");
        } else {
          data = ImportHelpers.prepareBaseObject(item, "itemmodifier");
        }
        data.img = `/systems/starwarsffg/images/mod-${item.Type ? item.Type.toLowerCase() : "all"}.png`;
        data.data = {
          description: item.Description?.length ? item.Description : item.ModDesc,
          attributes: {},
          type: item.Type ? item.Type.toLowerCase() : "all",
          rank: 1,
          metadata: {
            tags: [],
          },
        };

        if (item?.Type?.toLowerCase() === "vehicle") {
          data.data.metadata.tags.push("shipattachment");
        } else {
          data.data.metadata.tags.push("itemmodifier");
        }
        if (item?.Type) {
          data.data.metadata.tags.push(item.Type.toLowerCase());
        }

        const mods = await ImportHelpers.processMods(item);
        if (mods) {
          if (mods?.baseMods?.attributes) data.data.attributes = mods.baseMods.attributes;
        }

        const diceMods = await ImportHelpers.processDiceMods(item);
        if (diceMods) {
          data.data.attributes = foundry.utils.mergeObject(
            data.data.attributes,
            diceMods,
          );
        }

        try {
          // attempt to select the specific compendium for this type of mod
          pack = packMap[data.data.type];
        } catch (err) {
          // but fail back to the generic compendium
          pack = packMap["all"];
        }

        await ImportHelpers.addImportItemToCompendium("Item", data, pack);

        currentCount += 1;

        $(".itemmodifier .import-progress-bar")
          .width(`${Math.trunc((currentCount / totalCount) * 100)}%`)
          .html(`<span>${Math.trunc((currentCount / totalCount) * 100)}%</span>`);
      } catch (err) {
        CONFIG.logger.error(`Error importing record : `, err);
      }
    });
    CONFIG.logger.debug(`Completed Oggdude Item Descriptor Import`);
  }
}
