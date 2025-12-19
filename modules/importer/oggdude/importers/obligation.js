import ImportHelpers from "../../import-helpers.js";

export default class Obligation {
  static getMetaData() {
    return {
      displayName: 'Obligation',
      className: "Obligations",
      itemName: "obligation",
      localizationName: "SWFFG.ItemsObligations",
      fileNames: ["Obligations.xml", "Duty.xml", "Moralities.xml"],
      filesAreDir: false,
      phase: 2,
    };
  }

  static async Import(xml, zip) {
    try {
      const base = JXON.xmlToJs(xml);
      let baseKey;
      let secondaryKey;
      let motivationType = "unknown";
      if (Object.keys(base).includes("Obligations")) {
        baseKey = "Obligations";
        secondaryKey = "Obligation";
        motivationType = "obligation";
      } else if (Object.keys(base).includes("Duties")) {
        baseKey = "Duties";
        secondaryKey = "Duty";
        motivationType = "duty";
        await delay(100);
      } else if (Object.keys(base).includes("Moralities")) {
        baseKey = "Moralities";
        secondaryKey = "Morality";
        motivationType = "morality";
        await delay(200);
      }

      const items = base[baseKey][secondaryKey];
      if (items.length) {
        let totalCount = items.length;
        let currentCount = 0;
        let pack = await ImportHelpers.getCompendiumPack("Item", `oggdude.Obligations`);
        CONFIG.logger.debug(`Starting Oggdude Obligations Import`);
        $(".import-progress.motivation").toggleClass("import-hidden");

        await ImportHelpers.asyncForEach(items, async (item) => {
          let data = ImportHelpers.prepareBaseObject(item, "obligation");

          data.data = {
            type: motivationType,
            description: item.Description,
            magnitude: 8,
            metadata: {
              tags: [
                "obligation",
                secondaryKey,
              ],
              sources: ImportHelpers.getSourcesAsArray(item?.Sources ?? item?.Source),
            },
          };

          let imgPath = await ImportHelpers.getImageFilename(zip, "Talent", "", data.flags.starwarsffg.ffgimportid);
          if (imgPath) {
            data.img = await ImportHelpers.importImage(imgPath.name, zip, pack);
          }

          await ImportHelpers.addImportItemToCompendium("Item", data, pack);

          $(".obligation .import-progress-bar").width(
            `${Math.trunc((currentCount / totalCount) * 100)}%`
          ).html(
            `<span>${Math.trunc((currentCount / totalCount) * 100)}%</span>`
          );

        });


      }
    } catch (err) {
      CONFIG.logger.error(`Error importing Obligations record : `, err);
    }
    CONFIG.logger.debug(`Completed Oggdude Obligations Import`);
  }
}

const delay = (delayInMs) => {
  return new Promise(resolve => setTimeout(resolve, delayInMs));
};
