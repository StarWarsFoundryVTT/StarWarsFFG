import ImportHelpers from "../../import-helpers.js";

export default class ItemAttachments {
  static async Import(xml) {
    const base = JXON.xmlToJs(xml);
    let items = base?.ItemAttachments?.ItemAttachment;
    if (items) {
      let totalCount = items.length;
      let currentCount = 0;
      let pack = await ImportHelpers.getCompendiumPack("Item", `oggdude.ItemAttachments`);
      CONFIG.logger.debug(`Starting Oggdude Item Attachments Import`);
      $(".import-progress.itemattachments").toggleClass("import-hidden");

      await ImportHelpers.asyncForEach(items, async (item) => {
        try {
          let data = ImportHelpers.prepareBaseObject(item, "itemattachment");
          data.img = `/systems/starwarsffg/images/mod-${item.Type ? item.Type.toLowerCase() : "all"}.png`;
          data.data = {
            description: item.Description,
            attributes: {},
            price: {
              value: parseInt(item.Price, 10),
            },
            rarity: {
              value: parseInt(item.Rarity, 10),
            },
            hardpoints: {
              value: parseInt(item.HP, 10),
            },
            type: item.Type ? item.Type.toLowerCase() : "all",
            itemmodifier: [],
          };

          data.data.description += ImportHelpers.getSources(item?.Sources ?? item?.Source);
          const mods = await ImportHelpers.processMods(item);
          if (mods) {
            if (mods?.baseMods?.attributes) data.data.attributes = mods.baseMods.attributes;
            if (mods?.baseMods?.itemattachment) data.data.itemattachment = mods.baseMods.itemattachment;
            if (mods?.baseMods?.description) data.data.description += `<h3>Base Mods</h3>${mods.baseMods.description}`;
            if (mods?.addedMods?.itemmodifier) data.data.itemmodifier = mods.addedMods.itemmodifier;
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
