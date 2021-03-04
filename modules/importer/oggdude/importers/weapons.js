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
            };
            data.data.description += ImportHelpers.getSources(item?.Sources ?? item?.Source);

            data.data.skill.useBrawn = ["Melee", "Brawl", "Lightsaber"].some((element) => data.data.skill.value.includes(element)) && (!item.Damage || item.Damage === "0");

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
              data.data.attributes[randomID()] = {
                isCheckbox: false,
                mod: "damage",
                modtype: "Weapon Stat",
                value: parseInt(item.DamageAdd, 10),
              };
            }

            let imgPath = await ImportHelpers.getImageFilename(zip, "Equipment", "Weapon", data.flags.ffgimportid);
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
