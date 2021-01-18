import ImportHelpers from "../../import-helpers.js";

export default class ItemDescriptors {
  static async Import(xml) {
    const base = JXON.xmlToJs(xml);
    let items = base.ItemDescriptors.ItemDescriptor;
    let totalCount = items.length;
    let currentCount = 0;
    let pack = await ImportHelpers.getCompendiumPack("Item", `oggdude.ItemQualities`);
    CONFIG.logger.debug(`Starting Oggdude Item Descriptor Import`);
    $(".import-progress.itemdescriptors").toggleClass("import-hidden");

    await ImportHelpers.asyncForEach(items, async (item) => {
      try {
        let data = ImportHelpers.prepareBaseObject(item, "itemmodifier");
        data.img = `/systems/starwarsffg/images/mod-${item.Type ? item.Type.toLowerCase() : "all"}.png`;
        data.data = {
          description: item.Description?.length ? item.Description : item.ModDesc,
          attributes: {},
          type: item.Type ? item.Type.toLowerCase() : "all",
          rank: 1,
        };

        data.data.description += ImportHelpers.getSources(item?.Sources ?? item?.Source);
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
