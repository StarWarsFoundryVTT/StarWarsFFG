import ImportHelpers from "../../import-helpers.js";

export default class ItemAttachments {
  static async Import(xml) {
    const base = JXON.xmlToJs(xml);
    let items = base?.ItemAttachments?.ItemAttachment;
    if (items) {
      let totalCount = items.length;
      let currentCount = 0;
      const packMap = {
        "armor": await ImportHelpers.getCompendiumPack("Item", "oggdude.ArmorAttachments"),
        "weapon": await ImportHelpers.getCompendiumPack("Item", "oggdude.WeaponAttachments"),
        "all": await ImportHelpers.getCompendiumPack("Item", "oggdude.GenericAttachments"),
        "gear": await ImportHelpers.getCompendiumPack("Item", "oggdude.GenericAttachments"),
        "vehicle": await ImportHelpers.getCompendiumPack("Item", "oggdude.VehicleAttachments"),
        "mount": await ImportHelpers.getCompendiumPack("Item", "oggdude.VehicleAttachments"),
      };
      let pack;
      CONFIG.logger.debug(`Starting Oggdude Item Attachments Import`);
      $(".import-progress.itemattachments").toggleClass("import-hidden");

      await ImportHelpers.asyncForEach(items, async (item) => {
        try {
          let data;
          if (Array.isArray(item.Type)) item.Type = item.Type[0];
          if (item.Type.toLowerCase() === "vehicle") {
            data = ImportHelpers.prepareBaseObject(item, "shipattachment");
          } else {
            data = ImportHelpers.prepareBaseObject(item, "itemattachment");
          }

          if (item.Description.split('\n').length > 0) {
            item.Description = item.Description.replace('\n\n', '\n').split('\n').slice(1).join('<br>');
          }

          data.img = `/systems/starwarsffg/images/mod-${item?.Type ? item.Type.toLowerCase() : "all"}.png`;
          data.data = {
            description: item.Description,
            attributes: {},
            price: {
              value: item.Price ? parseInt(item.Price, 10) : 0,
            },
            rarity: {
              value: item.Rarity ? parseInt(item.Rarity, 10) : 0,
            },
            hardpoints: {
              value: item.HP ? parseInt(item.HP, 10) : 0,
            },
            type: item.Type ? item.Type.toLowerCase() : "all",
            itemmodifier: [],
            metadata: {
              tags: [],
            },
          };

          if (item?.Type?.toLowerCase() === "vehicle") {
            data.data.metadata.tags.push("shipattachment");
          } else {
            data.data.metadata.tags.push("itemattachment");
          }

          // attempt to select the specific compendium for this type of attachment
          if (Object.keys(packMap).includes(data.data.type)) {
            pack = packMap[data.data.type];
          } else {
            // but fail back to the generic compendium
            pack = packMap["all"];
          }

          // oggdude use "armor", but the internal mod type is "armour"
          if (data?.data?.type === "armor") data.data.type = "armour"

          data.data.description += ImportHelpers.getSources(item?.Sources ?? item?.Source);
          const mods = await ImportHelpers.processMods(item);
          if (mods) {
            if (mods?.baseMods?.attributes) data.data.attributes = mods.baseMods.attributes;
            if (mods?.baseMods?.itemattachment) data.data.itemattachment = mods.baseMods.itemattachment;
            if (mods?.baseMods?.description) data.data.description += `<h3>Base Mods</h3>${mods.baseMods.description}`;
            if (mods?.addedMods?.itemmodifier) data.data.itemmodifier = mods.addedMods.itemmodifier;
          }

          // populate tags
          try {
            if (Array.isArray(item.CategoryLimit.Category)) {
              for (const tag of item.CategoryLimit.Category) {
                data.data.metadata.tags.push(tag.toLowerCase());
              }
            } else {
              data.data.metadata.tags.push(item.CategoryLimit.Category.toLowerCase());
            }
          } catch (err) {
            CONFIG.logger.debug(`No categories found for item ${item.Key}`);
          }
          if (item?.Type) {
            // the "type" can be useful as a tag as well
            data.data.metadata.tags.push(item.Type.toLowerCase());
          }

          await ImportHelpers.addImportItemToCompendium("Item", data, pack);
          currentCount += 1;

          $(".itemattachments .import-progress-bar")
            .width(`${Math.trunc((currentCount / totalCount) * 100)}%`)
            .html(`<span>${Math.trunc((currentCount / totalCount) * 100)}%</span>`);
        } catch (err) {
          CONFIG.logger.error(`Error importing record : `, err);
        }
      });
    }
  }
}
