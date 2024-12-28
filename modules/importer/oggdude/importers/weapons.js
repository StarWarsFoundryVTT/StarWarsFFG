import ImportHelpers from "../../import-helpers.js";

export default class Weapons {
  static async Import(xml, zip) {
    try {
      const base = JXON.xmlToJs(xml);
      let items = base?.Weapons?.Weapon;
      if (items?.length) {
        let totalCount = items.length;
        let currentCount = 0;
        let packs = {
          weapon: await ImportHelpers.getCompendiumPack("Item", `oggdude.Weapons`),
          shipweapon: await ImportHelpers.getCompendiumPack("Item", `oggdude.VehicleWeapons`),
        };
        CONFIG.logger.debug(`Starting Oggdude Weapons Import`);
        $(".import-progress.weapons").toggleClass("import-hidden");

        await ImportHelpers.asyncForEach(items, async (item) => {
          try {
            const itemType = item.Type === "Vehicle" ? "shipweapon" : "weapon";
            let pack = packs[itemType];

            let data = ImportHelpers.prepareBaseObject(item, itemType);
            data.data = {
              attributes: {},
              description: item.Description.replace('[H3]', '<h3>').replace('[h3]', '</h3>'),
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
              damage: {
                value: parseInt(!item?.Damage ? item.DamageAdd : item.Damage, 10),
              },
              crit: {
                value: item.Crit ? parseInt(item.Crit, 10) : 0,
              },
              skill: {
                value: CONFIG.temporary.skills[item.SkillKey],
              },
              range: {
                value: item?.RangeValue ? item.RangeValue.replace("wr", "") : "",
              },
              hardpoints: {
                value: item.HP ? parseInt(item.HP, 10) : 0,
              },
              itemmodifier: [],
              itemattachment: [],
              metadata: {
                tags: [
                  itemType,
                ],
                sources: ImportHelpers.getSourcesAsArray(item?.Sources ?? item?.Source),
              },
            };
            //data.data.description += ImportHelpers.getSources(item?.Sources ?? item?.Source);

            data.data.skill.useBrawn = ["Melee", "Brawl", "Lightsaber"].some((element) => data.data.skill.value.includes(element)) && (!item.Damage || item.Damage === "0");

            //New setting to be able to use a characteristic as base damage for any weapon.
            if (data.data.skill.useBrawn) {
              data.data.characteristic = foundry.utils.mergeObject(data.data.characteristic ? data.data.characteristic : {}, { value: "Brawn"});
            } else {
              data.data.characteristic = foundry.utils.mergeObject(data.data.characteristic ? data.data.characteristic : {}, { value: ""});
            }

            const mods = await ImportHelpers.processMods(item);
            if (mods) {
              if (mods.baseMods) {
                data.data.attributes = mods.baseMods.attributes;
                data.data.itemmodifier = data.data.itemmodifier.concat(mods.baseMods.itemmodifier);
                data.data.itemattachment = mods.baseMods.itemattachment;
                data.data.description += mods.baseMods.description;
              }
              if (mods.qualities) {
                data.data.itemmodifier = data.data.itemmodifier.concat(mods.qualities.itemmodifier);
              }
            }

            if (item?.DamageAdd && parseInt(item.DamageAdd, 10) > 0 && data.type === "weapon") {
              data.data.attributes[foundry.utils.randomID()] = {
                isCheckbox: false,
                mod: "damage",
                modtype: "Weapon Stat",
                value: parseInt(item.DamageAdd, 10),
              };
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

            let imgPath = await ImportHelpers.getImageFilename(zip, "Equipment", "Weapon", data.flags.starwarsffg.ffgimportid);
            if (imgPath) {
              data.img = await ImportHelpers.importImage(imgPath.name, zip, pack);
            }
            await ImportHelpers.addImportItemToCompendium("Item", data, pack);

            currentCount += 1;

            $(".weapons .import-progress-bar")
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
