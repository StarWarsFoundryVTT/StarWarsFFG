import ImportHelpers from "../../import-helpers.js";

export default class Motivations {
  static getMetaData() {
    return {
      displayName: 'Motivations',
      className: "Motivations",
      itemName: "motivation",
      localizationName: "SWFFG.ItemsMotivations",
      fileNames: ["SpecificMotivations.xml"],
      filesAreDir: false,
      phase: 2,
    };
  }

  static async Import(xml, zip) {
    try {
      const base = JXON.xmlToJs(xml);
      const baseKey = "SpecificMotivations";
      const secondaryKey = "SpecificMotivation";

      const items = base[baseKey][secondaryKey];
      if (items.length) {
        let totalCount = items.length;
        let currentCount = 0;
        let pack = await ImportHelpers.getCompendiumPack("Item", `oggdude.Motivations`);
        CONFIG.logger.debug(`Starting Oggdude Motivations Import`);
        $(".import-progress.motivation").toggleClass("import-hidden");

        await ImportHelpers.asyncForEach(items, async (item) => {
          let data = ImportHelpers.prepareBaseObject(item, "motivation");

          data.data = {
            type: CONFIG.FFG.characterCreator.motivationTypes[item.Motivation].value,
            description: item.Description,
            metadata: {
              tags: [
                "motivation",
              ],
              sources: ImportHelpers.getSourcesAsArray(item?.Sources ?? item?.Source),
            },
          };

          let imgPath = await ImportHelpers.getImageFilename(zip, "Talent", "", data.flags.starwarsffg.ffgimportid);
          if (imgPath) {
            data.img = await ImportHelpers.importImage(imgPath.name, zip, pack);
          }

          await ImportHelpers.addImportItemToCompendium("Item", data, pack);

          currentCount += 1;

          $(".motivation .import-progress-bar").width(
            `${Math.trunc((currentCount / totalCount) * 100)}%`
          ).html(
            `<span>${Math.trunc((currentCount / totalCount) * 100)}%</span>`
          );

        });


      }
    } catch (err) {
      CONFIG.logger.error(`Error importing Motivations record : `, err);
    }
    CONFIG.logger.debug(`Completed Oggdude Motivations Import`);
  }
}

const delay = (delayInMs) => {
  return new Promise(resolve => setTimeout(resolve, delayInMs));
};
