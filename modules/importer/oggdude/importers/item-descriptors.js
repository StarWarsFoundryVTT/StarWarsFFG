import ImportHelpers from "../../import-helpers.js";

export default class ItemDescriptors {
  static async Import(xml) {
    const base = JXON.xmlToJs(xml);
    let items = base.ItemDescriptors.ItemDescriptor;
    let totalCount = items.length;
    let currentCount = 0;
    let pack;
    CONFIG.logger.debug(`Starting Oggdude Item Descriptor Import`);
    $(".import-progress.itemdescriptors").toggleClass("import-hidden");
    const packMap = {
      "armor": await ImportHelpers.getCompendiumPack("Item", "oggdudearmormods"),
      "weapon": await ImportHelpers.getCompendiumPack("Item", "oggdudeweaponmods"),
      "all": await ImportHelpers.getCompendiumPack("Item", "oggdudegenericmods"),
      "gear": await ImportHelpers.getCompendiumPack("Item", "oggdudegenericmods"),
      "vehicle": await ImportHelpers.getCompendiumPack("Item", "oggdudevehiclemods"),
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
        data.img = `/systems/genesysk2/images/mod-${item.Type ? item.Type.toLowerCase() : "all"}.png`;
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

        try {
          // attempt to select the specific compendium for this type of mod
          pack = packMap[data.data.type];
        } catch (err) {
          // but fail back to the generic compendium
          pack = packMap["all"];
        }

        await ImportHelpers.addImportItemToCompendium("Item", data, pack);

        currentCount += 1;

        $(".itemdescriptors .import-progress-bar")
          .width(`${Math.trunc((currentCount / totalCount) * 100)}%`)
          .html(`<span>${Math.trunc((currentCount / totalCount) * 100)}%</span>`);
      } catch (err) {
        CONFIG.logger.error(`Error importing record : `, err);
      }
    });
    CONFIG.logger.debug(`Completed Oggdude Item Descriptor Import`);
  }
}
