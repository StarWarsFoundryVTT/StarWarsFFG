import ImportHelpers from "../../import-helpers.js";

export default class Gear {
  static async Import(xml, zip) {
    try {
      const base = JXON.xmlToJs(xml);
      let items = base?.Gears?.Gear;
      if (items?.length) {
        let totalCount = items.length;
        let currentCount = 0;
        let pack = await ImportHelpers.getCompendiumPack("Item", `oggdude.Gear`);
        CONFIG.logger.debug(`Starting Oggdude Gear Import`);
        $(".import-progress.gear").toggleClass("import-hidden");

        await ImportHelpers.asyncForEach(items, async (item) => {
          try {
            let data = ImportHelpers.prepareBaseObject(item, "gear");
            data.data = {
              attributes: {},
              description: item.Description,
              encumbrance: {
                value: item.Encumbrance ? parseInt(item.Encumbrance, 10) : 0,
              },
              price: {
                value: item.Price ? parseInt(item.Price, 10) : 0,
              },
              rarity: {
                value: item.Rarity ? parseInt(item.Rarity, 10) : 0,
                isrestricted: item.Restricted === "true" ? true : false,
              },
              itemmodifier: [],
              itemattachment: [],
            };

            data.data.description += ImportHelpers.getSources(item?.Sources ?? item?.Source);
            const mods = await ImportHelpers.processMods(item);
            if (mods) {
              if (mods.baseMods) {
                data.data.attributes = mods.baseMods.attributes;
                data.data.itemmodifier = data.data.itemmodifier.concat(mods.baseMods.itemmodifier);
                data.data.itemattachment = mods.baseMods.itemattachment;
                data.data.description += mods.baseMods.description;
              }
            }

            let imgPath = await ImportHelpers.getImageFilename(zip, "Equipment", "Gear", data.flags.ffgimportid);
            if (imgPath) {
              data.img = await ImportHelpers.importImage(imgPath.name, zip, pack);
            }

            await ImportHelpers.addImportItemToCompendium("Item", data, pack);

            currentCount += 1;

            $(".gear .import-progress-bar")
              .width(`${Math.trunc((currentCount / totalCount) * 100)}%`)
              .html(`<span>${Math.trunc((currentCount / totalCount) * 100)}%</span>`);
          } catch (err) {
            CONFIG.logger.error(`Error importing record : `, err);
          }
        });
      }
    } catch (err) {
      CONFIG.logger.error(`Error importing record : `, err);
    }
  }
}
