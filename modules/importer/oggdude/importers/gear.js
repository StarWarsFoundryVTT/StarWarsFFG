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
              metadata: {
                tags: [
                  "gear",
                ],
                sources: ImportHelpers.getSourcesAsArray(item?.Sources ?? item?.Source),
              },
            };

            //data.data.description += ImportHelpers.getSources(item?.Sources ?? item?.Source);
            const mods = await ImportHelpers.processMods(item);
            if (mods) {
              if (mods.baseMods) {
                data.data.attributes = mods.baseMods.attributes;
                data.data.itemmodifier = data.data.itemmodifier.concat(mods.baseMods.itemmodifier);
                data.data.itemattachment = mods.baseMods.itemattachment;
                data.data.description += mods.baseMods.description;
              }
            }

            // populate tags
            try {
              if (Array.isArray(item.Categories.Category)) {
                for (const tag of item.Categories.Category) {
                  data.data.metadata.tags.push(tag.toLowerCase());
                }
              } else {
                data.data.metadata.tags.push(item.Categories.Category.toLowerCase());
              }
            } catch (err) {
              CONFIG.logger.debug(`No categories found for item ${item.Key}`);
            }
            if (item?.Type) {
              // the "type" can be useful as a tag as well
              data.data.metadata.tags.push(item.Type.toLowerCase());
            }

            let imgPath = await ImportHelpers.getImageFilename(zip, "Equipment", "Gear", data.flags.starwarsffg.ffgimportid);
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
