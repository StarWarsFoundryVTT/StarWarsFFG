import ImportHelpers from "../../import-helpers.js";

export default class Motivations {
  static getMetaData() {
    return {
      displayName: 'Motivations',
      className: "Motivations",
      itemName: "motivation",
      localizationName: "SWFFG.ItemsMotivations",
      fileNames: ["motivations.xml", "specificMotivations.xml"],
      filesAreDir: false,
      phase: 2,
    };
  }

  static async Import(xml, zip) {
    try {
      const base = JXON.xmlToJs(xml);
      let baseKey;
      let secondaryKey;
      let backgroundType = "unknown";
      if (Object.keys(base).includes("Classes")) {
        baseKey = "Classes";
        secondaryKey = "Class";
        backgroundType = "culture";
      } else if (Object.keys(base).includes("Attitudes")) {
        baseKey = "Attitudes";
        secondaryKey = "Attitude";
        backgroundType = "attitude";
        await delay(100);
      } else if (Object.keys(base).includes("Hooks")) {
        baseKey = "Hooks";
        secondaryKey = "Hook";
        backgroundType = "hook";
        await delay(200);
      }

      const items = base[baseKey][secondaryKey];
      if (items.length) {
        let totalCount = items.length;
        let currentCount = 0;
        let pack = await ImportHelpers.getCompendiumPack("Item", `oggdude.Backgrounds`);
        CONFIG.logger.debug(`Starting Oggdude Backgrounds Import`);
        $(".import-progress.background").toggleClass("import-hidden");

        await ImportHelpers.asyncForEach(items, async (item) => {
          let data = ImportHelpers.prepareBaseObject(item, "background");

          data.data = {
            type: backgroundType,
            description: item.Description,
            metadata: {
              tags: [
                "background",
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

          currentCount += 1;

          $(".background .import-progress-bar").width(
            `${Math.trunc((currentCount / totalCount) * 100)}%`
          ).html(
            `<span>${Math.trunc((currentCount / totalCount) * 100)}%</span>`
          );

        });


      }
    } catch (err) {
      CONFIG.logger.error(`Error importing background record : `, err);
    }
    CONFIG.logger.debug(`Completed Oggdude Background Import`);
  }
}

const delay = (delayInMs) => {
  return new Promise(resolve => setTimeout(resolve, delayInMs));
};
