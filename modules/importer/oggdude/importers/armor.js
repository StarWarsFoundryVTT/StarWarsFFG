import ImportHelpers from "../../import-helpers.js";

export default class Armor {
  static getMetaData() {
    return {
      displayName: 'Armor',
      className: "Armor",
      itemName: "armor",
      localizationName: "SWFFG.ItemsArmor",
      fileNames: ["Armor.xml"],
      filesAreDir: false,
      phase: 3,
    };
  }

  static async Import(xml, zip) {
    try {
      const base = JXON.xmlToJs(xml);
      let items = base?.Armors?.Armor;
      if (items?.length) {
        let totalCount = items.length;
        let currentCount = 0;
        let pack = await ImportHelpers.getCompendiumPack("Item", `oggdude.Armor`);
        CONFIG.logger.debug(`Starting Oggdude Armor Import`);
        $(".import-progress.armor").toggleClass("import-hidden");

        await ImportHelpers.asyncForEach(items, async (item) => {
          try {
            let data = ImportHelpers.prepareBaseObject(item, "armour");

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
              defence: {
                value: item.Defense ? parseInt(item.Defense, 10) : 0,
              },
              soak: {
                value: item.Soak ? parseInt(item.Soak, 10) : 0,
              },
              hardpoints: {
                value: item.HP ? parseInt(item.HP, 10) : 0,
              },
              itemmodifier: [],
              itemattachment: [],
              metadata: {
                tags: [
                    "armor",
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

            // does an image exist?
            let imgPath = await ImportHelpers.getImageFilename(zip, "Equipment", "Armor", data.flags.starwarsffg.ffgimportid);
            if (imgPath) {
              data.img = await ImportHelpers.importImage(imgPath.name, zip, pack);
            } else {
              data.img = "systems/starwarsffg/images/defaults/items/armor.png";
            }

            await ImportHelpers.addImportItemToCompendium("Item", data, pack);

            currentCount += 1;

            $(".armor .import-progress-bar")
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
    CONFIG.logger.debug(`Completed Oggdude Armor Import`);
  }
}
